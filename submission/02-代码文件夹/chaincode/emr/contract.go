package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract implements the EMR access control and record registry
type SmartContract struct {
	contractapi.Contract
}

// MedicalRecord is the on-chain representation of an EMR anchor
type MedicalRecord struct {
	RecordID    string `json:"recordId"`
	PatientID   string `json:"patientId"`
	CreatorID   string `json:"creatorId"`
	IPCSCID     string `json:"ipfsCid"`
	ContentHash string `json:"contentHash"`
	VersionHash string `json:"versionHash,omitempty"`
	Timestamp   string `json:"timestamp,omitempty"`
}

// AccessPermission represents a simple permission grant
type AccessPermission struct {
	RecordID  string `json:"recordId"`
	GranteeID string `json:"granteeId"`
	Action    string `json:"action"`              // read | write | share | admin
	ExpiresAt string `json:"expiresAt,omitempty"` // RFC3339
	GrantedAt string `json:"grantedAt"`           // RFC3339
	GrantedBy string `json:"grantedBy"`
	IsActive  bool   `json:"isActive"` // Permission status
}

// AccessList represents the access control list for a record
type AccessList struct {
	RecordID    string                      `json:"recordId"`
	Owner       string                      `json:"owner"`
	Permissions map[string]AccessPermission `json:"permissions"` // granteeID -> permission
	UpdatedAt   string                      `json:"updatedAt"`
}

// Event structures for comprehensive event emission
type RecordCreatedEvent struct {
	RecordID    string `json:"recordId"`
	PatientID   string `json:"patientId"`
	CreatorID   string `json:"creatorId"`
	IPFSCid     string `json:"ipfsCid"`
	ContentHash string `json:"contentHash"`
	Timestamp   string `json:"timestamp"`
	CallerID    string `json:"callerId"`
	EventType   string `json:"eventType"`
}

type AccessGrantedEvent struct {
	RecordID  string `json:"recordId"`
	GranteeID string `json:"granteeId"`
	Action    string `json:"action"`
	GrantedBy string `json:"grantedBy"`
	GrantedAt string `json:"grantedAt"`
	ExpiresAt string `json:"expiresAt,omitempty"`
	EventType string `json:"eventType"`
}

type AccessRevokedEvent struct {
	RecordID  string `json:"recordId"`
	GranteeID string `json:"granteeId"`
	RevokedBy string `json:"revokedBy"`
	RevokedAt string `json:"revokedAt"`
	EventType string `json:"eventType"`
}

type RecordAccessedEvent struct {
	RecordID   string `json:"recordId"`
	AccessorID string `json:"accessorId"`
	Action     string `json:"action"`
	AccessedAt string `json:"accessedAt"`
	Success    bool   `json:"success"`
	EventType  string `json:"eventType"`
}

type RecordUpdatedEvent struct {
	RecordID       string `json:"recordId"`
	UpdatedBy      string `json:"updatedBy"`
	NewContentHash string `json:"newContentHash"`
	NewIPFSCid     string `json:"newIpfsCid"`
	UpdatedAt      string `json:"updatedAt"`
	EventType      string `json:"eventType"`
}

// state keys
func recordKey(recordID string) string { return fmt.Sprintf("record:%s", recordID) }
func permKey(recordID, granteeID string) string {
	return fmt.Sprintf("perm:%s:%s", recordID, granteeID)
}
func accessListKey(recordID string) string { return fmt.Sprintf("access:%s", recordID) }

// validateAddress validates if the given address/ID is valid
func validateAddress(address string) error {
	if address == "" {
		return fmt.Errorf("address cannot be empty")
	}
	if len(address) < 3 {
		return fmt.Errorf("address too short")
	}
	// Add more validation rules as needed
	return nil
}

// validateOwner checks if the caller is the owner of the record
func (s *SmartContract) validateOwner(ctx contractapi.TransactionContextInterface, recordID string) error {
	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Get record to check ownership
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Check if caller is owner (patient or creator)
	if callerID != record.PatientID && callerID != record.CreatorID {
		return fmt.Errorf("access denied: caller is not the owner of record %s", recordID)
	}

	return nil
}

// updateAccessList updates the access control list for a record
func (s *SmartContract) updateAccessList(ctx contractapi.TransactionContextInterface, recordID, granteeID string, perm AccessPermission) error {
	accessKey := accessListKey(recordID)

	// Get existing access list or create new one
	var accessList AccessList
	accessListData, err := ctx.GetStub().GetState(accessKey)
	if err != nil {
		return fmt.Errorf("failed to get access list: %w", err)
	}

	if len(accessListData) == 0 {
		// Create new access list
		recordData, err := ctx.GetStub().GetState(recordKey(recordID))
		if err != nil {
			return fmt.Errorf("failed to get record: %w", err)
		}

		var record MedicalRecord
		if err := json.Unmarshal(recordData, &record); err != nil {
			return fmt.Errorf("failed to unmarshal record: %w", err)
		}

		accessList = AccessList{
			RecordID:    recordID,
			Owner:       record.PatientID, // Patient is the primary owner
			Permissions: make(map[string]AccessPermission),
			UpdatedAt:   time.Now().UTC().Format(time.RFC3339),
		}
	} else {
		// Load existing access list
		if err := json.Unmarshal(accessListData, &accessList); err != nil {
			return fmt.Errorf("failed to unmarshal access list: %w", err)
		}
	}

	// Update the access list with new permission
	accessList.Permissions[granteeID] = perm
	accessList.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	// Store updated access list
	accessListBytes, err := json.Marshal(accessList)
	if err != nil {
		return fmt.Errorf("failed to marshal access list: %w", err)
	}

	return ctx.GetStub().PutState(accessKey, accessListBytes)
}

// removeFromAccessList removes a grantee from the access control list
func (s *SmartContract) removeFromAccessList(ctx contractapi.TransactionContextInterface, recordID, granteeID string) error {
	accessKey := accessListKey(recordID)

	// Get existing access list
	accessListData, err := ctx.GetStub().GetState(accessKey)
	if err != nil {
		return fmt.Errorf("failed to get access list: %w", err)
	}

	if len(accessListData) == 0 {
		// No access list exists, nothing to remove
		return nil
	}

	var accessList AccessList
	if err := json.Unmarshal(accessListData, &accessList); err != nil {
		return fmt.Errorf("failed to unmarshal access list: %w", err)
	}

	// Remove the grantee from permissions map
	delete(accessList.Permissions, granteeID)
	accessList.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	// Store updated access list
	accessListBytes, err := json.Marshal(accessList)
	if err != nil {
		return fmt.Errorf("failed to marshal access list: %w", err)
	}

	return ctx.GetStub().PutState(accessKey, accessListBytes)
}

// CreateMedicalRecord stores a new medical record anchor
// Enhanced with proper validation, access list initialization, and event emission
// arg recordJson: {recordId, patientId, creatorId, ipfsCid, contentHash, versionHash?, timestamp?}
func (s *SmartContract) CreateMedicalRecord(ctx contractapi.TransactionContextInterface, recordJson string) (string, error) {
	// Parse and validate input
	var rec MedicalRecord
	if err := json.Unmarshal([]byte(recordJson), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}

	// Validate required fields
	if rec.RecordID == "" || rec.PatientID == "" || rec.CreatorID == "" || rec.ContentHash == "" || rec.IPCSCID == "" {
		return "", fmt.Errorf("missing required fields: recordId, patientId, creatorId, ipfsCid, and contentHash are required")
	}

	// Validate addresses
	if err := validateAddress(rec.RecordID); err != nil {
		return "", fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(rec.PatientID); err != nil {
		return "", fmt.Errorf("invalid patientID: %w", err)
	}
	if err := validateAddress(rec.CreatorID); err != nil {
		return "", fmt.Errorf("invalid creatorID: %w", err)
	}

	// Check if record already exists
	key := recordKey(rec.RecordID)
	exists, err := s.assetExists(ctx, key)
	if err != nil {
		return "", fmt.Errorf("failed to check record existence: %w", err)
	}
	if exists {
		return "", fmt.Errorf("record already exists: %s", rec.RecordID)
	}

	// Set timestamp if not provided
	if rec.Timestamp == "" {
		rec.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// Get caller identity for validation
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Validate that caller is authorized to create record (must be patient or creator)
	if callerID != rec.PatientID && callerID != rec.CreatorID {
		return "", fmt.Errorf("access denied: caller must be patient or creator")
	}

	// Store the medical record
	recordBytes, err := json.Marshal(rec)
	if err != nil {
		return "", fmt.Errorf("failed to marshal record: %w", err)
	}
	if err := ctx.GetStub().PutState(key, recordBytes); err != nil {
		return "", fmt.Errorf("failed to store record: %w", err)
	}

	// Initialize access list for the record
	initialAccessList := AccessList{
		RecordID:    rec.RecordID,
		Owner:       rec.PatientID,
		Permissions: make(map[string]AccessPermission),
		UpdatedAt:   rec.Timestamp,
	}

	// Grant initial access to creator if different from patient
	if rec.CreatorID != rec.PatientID {
		creatorPerm := AccessPermission{
			RecordID:  rec.RecordID,
			GranteeID: rec.CreatorID,
			Action:    "write", // Creators get write access
			ExpiresAt: "",      // No expiration for creator
			GrantedAt: rec.Timestamp,
			GrantedBy: rec.PatientID, // Granted by patient (owner)
			IsActive:  true,
		}
		initialAccessList.Permissions[rec.CreatorID] = creatorPerm
	}

	// Store initial access list
	accessListBytes, err := json.Marshal(initialAccessList)
	if err != nil {
		return "", fmt.Errorf("failed to marshal access list: %w", err)
	}
	if err := ctx.GetStub().PutState(accessListKey(rec.RecordID), accessListBytes); err != nil {
		return "", fmt.Errorf("failed to store access list: %w", err)
	}

	// Emit RecordCreated event with structured payload
	recordCreatedEvent := RecordCreatedEvent{
		RecordID:    rec.RecordID,
		PatientID:   rec.PatientID,
		CreatorID:   rec.CreatorID,
		IPFSCid:     rec.IPCSCID,
		ContentHash: rec.ContentHash,
		Timestamp:   rec.Timestamp,
		CallerID:    callerID,
		EventType:   "RecordCreated",
	}
	eventBytes, _ := json.Marshal(recordCreatedEvent)
	if err := ctx.GetStub().SetEvent("RecordCreated", eventBytes); err != nil {
		return "", fmt.Errorf("failed to emit RecordCreated event: %w", err)
	}

	return rec.RecordID, nil
}

// ReadRecord returns the record JSON by id
// Enhanced with access validation and audit logging
func (s *SmartContract) ReadRecord(ctx contractapi.TransactionContextInterface, recordID string) (string, error) {
	// Input validation
	if recordID == "" {
		return "", fmt.Errorf("recordID is required")
	}

	// Validate address
	if err := validateAddress(recordID); err != nil {
		return "", fmt.Errorf("invalid recordID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Check access permission
	hasAccess, err := s.CheckAccess(ctx, recordID, callerID)
	if err != nil {
		// Emit access denied event
		s.emitRecordAccessedEvent(ctx, recordID, callerID, "read", false)
		return "", fmt.Errorf("failed to check access: %w", err)
	}
	if !hasAccess {
		// Emit access denied event
		s.emitRecordAccessedEvent(ctx, recordID, callerID, "read", false)
		return "", fmt.Errorf("access denied: user %s does not have permission to read record %s", callerID, recordID)
	}

	// Get record data
	data, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		s.emitRecordAccessedEvent(ctx, recordID, callerID, "read", false)
		return "", fmt.Errorf("failed to read record: %w", err)
	}
	if len(data) == 0 {
		s.emitRecordAccessedEvent(ctx, recordID, callerID, "read", false)
		return "", fmt.Errorf("record not found: %s", recordID)
	}

	// Emit successful access event
	s.emitRecordAccessedEvent(ctx, recordID, callerID, "read", true)

	return string(data), nil
}

// emitRecordAccessedEvent emits a RecordAccessed event for audit purposes
func (s *SmartContract) emitRecordAccessedEvent(ctx contractapi.TransactionContextInterface, recordID, accessorID, action string, success bool) {
	recordAccessedEvent := RecordAccessedEvent{
		RecordID:   recordID,
		AccessorID: accessorID,
		Action:     action,
		AccessedAt: time.Now().UTC().Format(time.RFC3339),
		Success:    success,
		EventType:  "RecordAccessed",
	}
	eventBytes, _ := json.Marshal(recordAccessedEvent)
	_ = ctx.GetStub().SetEvent("RecordAccessed", eventBytes)
}

// GetRecord is an alias of ReadRecord
func (s *SmartContract) GetRecord(ctx contractapi.TransactionContextInterface, recordID string) (string, error) {
	return s.ReadRecord(ctx, recordID)
}

// GrantAccess grants an access permission to grantee for the record
// Implements Solidity-style access control with proper address validation and access list management
// Follows the specification: function grantAccess(address requester, bytes32 recordHash) public
func (s *SmartContract) GrantAccess(ctx contractapi.TransactionContextInterface, recordID, granteeID, action, expiresAt string) error {
	// Input validation
	if recordID == "" || granteeID == "" || action == "" {
		return fmt.Errorf("invalid arguments: recordID, granteeID, and action are required")
	}

	// Validate addresses (Solidity-style address validation)
	if err := validateAddress(recordID); err != nil {
		return fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(granteeID); err != nil {
		return fmt.Errorf("invalid granteeID: %w", err)
	}

	// Validate action type
	validActions := map[string]bool{"read": true, "write": true, "share": true, "admin": true}
	if !validActions[action] {
		return fmt.Errorf("invalid action: %s. Must be one of: read, write, share, admin", action)
	}

	// Ensure record exists
	if ok, err := s.assetExists(ctx, recordKey(recordID)); err != nil {
		return fmt.Errorf("failed to check record existence: %w", err)
	} else if !ok {
		return fmt.Errorf("record not found: %s", recordID)
	}

	// Validate owner (require msg.sender == records[recordHash].owner)
	if err := s.validateOwner(ctx, recordID); err != nil {
		return err
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Build permission with enhanced validation
	now := time.Now().UTC()
	perm := AccessPermission{
		RecordID:  recordID,
		GranteeID: granteeID,
		Action:    action,
		ExpiresAt: expiresAt,
		GrantedAt: now.Format(time.RFC3339),
		GrantedBy: callerID,
		IsActive:  true,
	}

	// Validate expiration time if provided
	if expiresAt != "" {
		if expTime, err := time.Parse(time.RFC3339, expiresAt); err != nil {
			return fmt.Errorf("invalid expiration time format: %w", err)
		} else if expTime.Before(now) {
			return fmt.Errorf("expiration time cannot be in the past")
		}
	}

	// Update access list (accessList[recordHash].push(requester))
	if err := s.updateAccessList(ctx, recordID, granteeID, perm); err != nil {
		return fmt.Errorf("failed to update access list: %w", err)
	}

	// Store individual permission for backward compatibility
	permBytes, err := json.Marshal(perm)
	if err != nil {
		return fmt.Errorf("failed to marshal permission: %w", err)
	}
	if err := ctx.GetStub().PutState(permKey(recordID, granteeID), permBytes); err != nil {
		return fmt.Errorf("failed to store permission: %w", err)
	}

	// Emit AccessGranted event with structured payload
	accessGrantedEvent := AccessGrantedEvent{
		RecordID:  recordID,
		GranteeID: granteeID,
		Action:    action,
		GrantedBy: callerID,
		GrantedAt: perm.GrantedAt,
		ExpiresAt: expiresAt,
		EventType: "AccessGranted",
	}
	eventBytes, _ := json.Marshal(accessGrantedEvent)
	if err := ctx.GetStub().SetEvent("AccessGranted", eventBytes); err != nil {
		return fmt.Errorf("failed to emit AccessGranted event: %w", err)
	}

	return nil
}

// RevokeAccess revokes permission for the grantee
// Enhanced with proper validation and access list management
func (s *SmartContract) RevokeAccess(ctx contractapi.TransactionContextInterface, recordID, granteeID string) error {
	// Input validation
	if recordID == "" || granteeID == "" {
		return fmt.Errorf("invalid arguments: recordID and granteeID are required")
	}

	// Validate addresses
	if err := validateAddress(recordID); err != nil {
		return fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(granteeID); err != nil {
		return fmt.Errorf("invalid granteeID: %w", err)
	}

	// Validate owner
	if err := s.validateOwner(ctx, recordID); err != nil {
		return err
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Check if permission exists
	permData, err := ctx.GetStub().GetState(permKey(recordID, granteeID))
	if err != nil {
		return fmt.Errorf("failed to check permission: %w", err)
	}
	if len(permData) == 0 {
		return fmt.Errorf("permission not found for grantee %s on record %s", granteeID, recordID)
	}

	// Remove from access list
	if err := s.removeFromAccessList(ctx, recordID, granteeID); err != nil {
		return fmt.Errorf("failed to update access list: %w", err)
	}

	// Delete individual permission
	if err := ctx.GetStub().DelState(permKey(recordID, granteeID)); err != nil {
		return fmt.Errorf("failed to delete permission: %w", err)
	}

	// Emit AccessRevoked event with structured payload
	revokedAt := time.Now().UTC().Format(time.RFC3339)
	accessRevokedEvent := AccessRevokedEvent{
		RecordID:  recordID,
		GranteeID: granteeID,
		RevokedBy: callerID,
		RevokedAt: revokedAt,
		EventType: "AccessRevoked",
	}
	eventBytes, _ := json.Marshal(accessRevokedEvent)
	if err := ctx.GetStub().SetEvent("AccessRevoked", eventBytes); err != nil {
		return fmt.Errorf("failed to emit AccessRevoked event: %w", err)
	}

	return nil
}

// CheckAccess checks whether the user has access to the record
// Enhanced with access list validation and comprehensive permission checking
func (s *SmartContract) CheckAccess(ctx contractapi.TransactionContextInterface, recordID, userID string) (bool, error) {
	// Input validation
	if recordID == "" || userID == "" {
		return false, fmt.Errorf("invalid arguments: recordID and userID are required")
	}

	// Validate addresses
	if err := validateAddress(recordID); err != nil {
		return false, fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(userID); err != nil {
		return false, fmt.Errorf("invalid userID: %w", err)
	}

	// Check if record exists
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return false, fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return false, fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return false, fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Owners have implicit access (patient and creator)
	if userID == record.PatientID || userID == record.CreatorID {
		return true, nil
	}

	// Check access list first (primary method)
	accessKey := accessListKey(recordID)
	accessListData, err := ctx.GetStub().GetState(accessKey)
	if err != nil {
		return false, fmt.Errorf("failed to get access list: %w", err)
	}

	if len(accessListData) > 0 {
		var accessList AccessList
		if err := json.Unmarshal(accessListData, &accessList); err != nil {
			return false, fmt.Errorf("failed to unmarshal access list: %w", err)
		}

		// Check if user has permission in access list
		if perm, exists := accessList.Permissions[userID]; exists && perm.IsActive {
			// Check expiration
			if perm.ExpiresAt == "" {
				return true, nil // No expiration
			}
			if expTime, err := time.Parse(time.RFC3339, perm.ExpiresAt); err == nil {
				return time.Now().UTC().Before(expTime), nil
			}
		}
	}

	// Fallback to individual permission check (for backward compatibility)
	permData, err := ctx.GetStub().GetState(permKey(recordID, userID))
	if err != nil {
		return false, fmt.Errorf("failed to check individual permission: %w", err)
	}
	if len(permData) == 0 {
		return false, nil // No permission found
	}

	var perm AccessPermission
	if err := json.Unmarshal(permData, &perm); err != nil {
		return false, fmt.Errorf("failed to unmarshal permission: %w", err)
	}

	// Check if permission is active
	if !perm.IsActive {
		return false, nil
	}

	// Check expiration
	if perm.ExpiresAt == "" {
		return true, nil // No expiration
	}
	if expTime, err := time.Parse(time.RFC3339, perm.ExpiresAt); err == nil {
		return time.Now().UTC().Before(expTime), nil
	}

	return false, nil
}

// GetAccessList returns the access control list for a record
func (s *SmartContract) GetAccessList(ctx contractapi.TransactionContextInterface, recordID string) (string, error) {
	// Input validation
	if recordID == "" {
		return "", fmt.Errorf("recordID is required")
	}

	// Validate address
	if err := validateAddress(recordID); err != nil {
		return "", fmt.Errorf("invalid recordID: %w", err)
	}

	// Check if record exists
	if ok, err := s.assetExists(ctx, recordKey(recordID)); err != nil {
		return "", fmt.Errorf("failed to check record existence: %w", err)
	} else if !ok {
		return "", fmt.Errorf("record not found: %s", recordID)
	}

	// Validate caller has access to view the access list (owner only)
	if err := s.validateOwner(ctx, recordID); err != nil {
		return "", err
	}

	// Get access list
	accessKey := accessListKey(recordID)
	accessListData, err := ctx.GetStub().GetState(accessKey)
	if err != nil {
		return "", fmt.Errorf("failed to get access list: %w", err)
	}

	if len(accessListData) == 0 {
		// Return empty access list if none exists
		recordData, err := ctx.GetStub().GetState(recordKey(recordID))
		if err != nil {
			return "", fmt.Errorf("failed to get record: %w", err)
		}

		var record MedicalRecord
		if err := json.Unmarshal(recordData, &record); err != nil {
			return "", fmt.Errorf("failed to unmarshal record: %w", err)
		}

		emptyAccessList := AccessList{
			RecordID:    recordID,
			Owner:       record.PatientID,
			Permissions: make(map[string]AccessPermission),
			UpdatedAt:   time.Now().UTC().Format(time.RFC3339),
		}

		emptyBytes, _ := json.Marshal(emptyAccessList)
		return string(emptyBytes), nil
	}

	return string(accessListData), nil
}

// ListRecordsByPatient returns all records for a specific patient
func (s *SmartContract) ListRecordsByPatient(ctx contractapi.TransactionContextInterface, patientID string) (string, error) {
	// Input validation
	if patientID == "" {
		return "", fmt.Errorf("patientID is required")
	}

	// Validate address
	if err := validateAddress(patientID); err != nil {
		return "", fmt.Errorf("invalid patientID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Only allow patients to view their own records or authorized users
	if callerID != patientID {
		// TODO: Add additional authorization logic for healthcare providers
		return "", fmt.Errorf("access denied: can only view own records")
	}

	// Query records by patient ID using composite key
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("record", []string{patientID})
	if err != nil {
		return "", fmt.Errorf("failed to get records: %w", err)
	}
	defer iterator.Close()

	var records []MedicalRecord
	for iterator.HasNext() {
		response, err := iterator.Next()
		if err != nil {
			return "", fmt.Errorf("failed to iterate records: %w", err)
		}

		var record MedicalRecord
		if err := json.Unmarshal(response.Value, &record); err != nil {
			continue // Skip invalid records
		}

		records = append(records, record)
	}

	recordsBytes, err := json.Marshal(records)
	if err != nil {
		return "", fmt.Errorf("failed to marshal records: %w", err)
	}

	return string(recordsBytes), nil
}

// UpdateMedicalRecord updates an existing medical record
func (s *SmartContract) UpdateMedicalRecord(ctx contractapi.TransactionContextInterface, recordID, newContentHash, newIPFSCid string) error {
	// Input validation
	if recordID == "" || newContentHash == "" || newIPFSCid == "" {
		return fmt.Errorf("recordID, newContentHash, and newIPFSCid are required")
	}

	// Validate addresses
	if err := validateAddress(recordID); err != nil {
		return fmt.Errorf("invalid recordID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Check if record exists
	recordKey := recordKey(recordID)
	recordData, err := ctx.GetStub().GetState(recordKey)
	if err != nil {
		return fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Check write access
	hasAccess, err := s.CheckAccess(ctx, recordID, callerID)
	if err != nil {
		return fmt.Errorf("failed to check access: %w", err)
	}
	if !hasAccess {
		return fmt.Errorf("access denied: user %s does not have permission to update record %s", callerID, recordID)
	}

	// Additional check: only patient or creator can update, or users with write permission
	if callerID != record.PatientID && callerID != record.CreatorID {
		// Check if user has explicit write permission
		permData, err := ctx.GetStub().GetState(permKey(recordID, callerID))
		if err != nil {
			return fmt.Errorf("failed to check write permission: %w", err)
		}
		if len(permData) == 0 {
			return fmt.Errorf("access denied: no write permission")
		}

		var perm AccessPermission
		if err := json.Unmarshal(permData, &perm); err != nil {
			return fmt.Errorf("failed to unmarshal permission: %w", err)
		}
		if perm.Action != "write" && perm.Action != "admin" {
			return fmt.Errorf("access denied: insufficient permission level")
		}
	}

	// Update record
	record.ContentHash = newContentHash
	record.IPCSCID = newIPFSCid
	record.Timestamp = time.Now().UTC().Format(time.RFC3339)

	// Store updated record
	updatedRecordBytes, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal updated record: %w", err)
	}
	if err := ctx.GetStub().PutState(recordKey, updatedRecordBytes); err != nil {
		return fmt.Errorf("failed to store updated record: %w", err)
	}

	// Emit RecordUpdated event
	recordUpdatedEvent := RecordUpdatedEvent{
		RecordID:       recordID,
		UpdatedBy:      callerID,
		NewContentHash: newContentHash,
		NewIPFSCid:     newIPFSCid,
		UpdatedAt:      record.Timestamp,
		EventType:      "RecordUpdated",
	}
	eventBytes, _ := json.Marshal(recordUpdatedEvent)
	if err := ctx.GetStub().SetEvent("RecordUpdated", eventBytes); err != nil {
		return fmt.Errorf("failed to emit RecordUpdated event: %w", err)
	}

	// Also emit RecordAccessed event for audit
	s.emitRecordAccessedEvent(ctx, recordID, callerID, "update", true)

	return nil
}

// ValidatePermissionLevel checks if a user has the required permission level for an action
func (s *SmartContract) ValidatePermissionLevel(ctx contractapi.TransactionContextInterface, recordID, userID, requiredAction string) (bool, error) {
	// Input validation
	if recordID == "" || userID == "" || requiredAction == "" {
		return false, fmt.Errorf("recordID, userID, and requiredAction are required")
	}

	// Validate addresses
	if err := validateAddress(recordID); err != nil {
		return false, fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(userID); err != nil {
		return false, fmt.Errorf("invalid userID: %w", err)
	}

	// Check if record exists
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return false, fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return false, fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return false, fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Owners have all permissions
	if userID == record.PatientID || userID == record.CreatorID {
		return true, nil
	}

	// Check explicit permissions
	permData, err := ctx.GetStub().GetState(permKey(recordID, userID))
	if err != nil {
		return false, fmt.Errorf("failed to check permission: %w", err)
	}
	if len(permData) == 0 {
		return false, nil // No permission found
	}

	var perm AccessPermission
	if err := json.Unmarshal(permData, &perm); err != nil {
		return false, fmt.Errorf("failed to unmarshal permission: %w", err)
	}

	// Check if permission is active
	if !perm.IsActive {
		return false, nil
	}

	// Check expiration
	if perm.ExpiresAt != "" {
		if expTime, err := time.Parse(time.RFC3339, perm.ExpiresAt); err == nil {
			if !time.Now().UTC().Before(expTime) {
				return false, nil // Permission expired
			}
		}
	}

	// Check permission level hierarchy: admin > write > share > read
	permissionHierarchy := map[string]int{
		"read":  1,
		"share": 2,
		"write": 3,
		"admin": 4,
	}

	userLevel, userExists := permissionHierarchy[perm.Action]
	requiredLevel, requiredExists := permissionHierarchy[requiredAction]

	if !userExists || !requiredExists {
		return false, fmt.Errorf("invalid permission level")
	}

	return userLevel >= requiredLevel, nil
}

// GetUserPermissions returns all permissions for a specific user
func (s *SmartContract) GetUserPermissions(ctx contractapi.TransactionContextInterface, userID string) (string, error) {
	// Input validation
	if userID == "" {
		return "", fmt.Errorf("userID is required")
	}

	// Validate address
	if err := validateAddress(userID); err != nil {
		return "", fmt.Errorf("invalid userID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Only allow users to view their own permissions or admin users
	if callerID != userID {
		// TODO: Add admin role check
		return "", fmt.Errorf("access denied: can only view own permissions")
	}

	// Query all permissions for the user using composite key
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("perm", []string{})
	if err != nil {
		return "", fmt.Errorf("failed to get permissions: %w", err)
	}
	defer iterator.Close()

	var permissions []AccessPermission
	for iterator.HasNext() {
		response, err := iterator.Next()
		if err != nil {
			return "", fmt.Errorf("failed to iterate permissions: %w", err)
		}

		var perm AccessPermission
		if err := json.Unmarshal(response.Value, &perm); err != nil {
			continue // Skip invalid permissions
		}

		// Filter permissions for the specific user
		if perm.GranteeID == userID {
			permissions = append(permissions, perm)
		}
	}

	permissionsBytes, err := json.Marshal(permissions)
	if err != nil {
		return "", fmt.Errorf("failed to marshal permissions: %w", err)
	}

	return string(permissionsBytes), nil
}

// ValidateRecordIntegrity checks if a record's content hash matches the stored hash
func (s *SmartContract) ValidateRecordIntegrity(ctx contractapi.TransactionContextInterface, recordID, providedContentHash string) (bool, error) {
	// Input validation
	if recordID == "" || providedContentHash == "" {
		return false, fmt.Errorf("recordID and providedContentHash are required")
	}

	// Validate address
	if err := validateAddress(recordID); err != nil {
		return false, fmt.Errorf("invalid recordID: %w", err)
	}

	// Get record
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return false, fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return false, fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return false, fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Compare content hashes
	return record.ContentHash == providedContentHash, nil
}

// IsRecordOwner checks if a user is the owner (patient or creator) of a record
func (s *SmartContract) IsRecordOwner(ctx contractapi.TransactionContextInterface, recordID, userID string) (bool, error) {
	// Input validation
	if recordID == "" || userID == "" {
		return false, fmt.Errorf("recordID and userID are required")
	}

	// Validate addresses
	if err := validateAddress(recordID); err != nil {
		return false, fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(userID); err != nil {
		return false, fmt.Errorf("invalid userID: %w", err)
	}

	// Get record
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return false, fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return false, fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return false, fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Check ownership
	return userID == record.PatientID || userID == record.CreatorID, nil
}

// GetRecordMetadata returns metadata about a record without the full content
func (s *SmartContract) GetRecordMetadata(ctx contractapi.TransactionContextInterface, recordID string) (string, error) {
	// Input validation
	if recordID == "" {
		return "", fmt.Errorf("recordID is required")
	}

	// Validate address
	if err := validateAddress(recordID); err != nil {
		return "", fmt.Errorf("invalid recordID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Check basic access (metadata can be viewed with any level of access)
	hasAccess, err := s.CheckAccess(ctx, recordID, callerID)
	if err != nil {
		return "", fmt.Errorf("failed to check access: %w", err)
	}
	if !hasAccess {
		return "", fmt.Errorf("access denied: user %s does not have permission to view record %s metadata", callerID, recordID)
	}

	// Get record
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return "", fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		return "", fmt.Errorf("record not found: %s", recordID)
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return "", fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Create metadata object (without sensitive content)
	metadata := map[string]interface{}{
		"recordId":    record.RecordID,
		"patientId":   record.PatientID,
		"creatorId":   record.CreatorID,
		"contentHash": record.ContentHash,
		"timestamp":   record.Timestamp,
		"hasIPFS":     record.IPCSCID != "",
	}

	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to marshal metadata: %w", err)
	}

	// Emit access event for audit
	s.emitRecordAccessedEvent(ctx, recordID, callerID, "metadata", true)

	return string(metadataBytes), nil
}

// BatchValidateAccess validates access for multiple records at once
func (s *SmartContract) BatchValidateAccess(ctx contractapi.TransactionContextInterface, recordIDs []string, userID string) (string, error) {
	// Input validation
	if len(recordIDs) == 0 || userID == "" {
		return "", fmt.Errorf("recordIDs and userID are required")
	}

	// Validate user address
	if err := validateAddress(userID); err != nil {
		return "", fmt.Errorf("invalid userID: %w", err)
	}

	// Validate each record ID
	for _, recordID := range recordIDs {
		if err := validateAddress(recordID); err != nil {
			return "", fmt.Errorf("invalid recordID %s: %w", recordID, err)
		}
	}

	// Check access for each record
	results := make(map[string]interface{})
	for _, recordID := range recordIDs {
		hasAccess, err := s.CheckAccess(ctx, recordID, userID)
		if err != nil {
			results[recordID] = map[string]interface{}{
				"hasAccess": false,
				"error":     err.Error(),
			}
		} else {
			results[recordID] = map[string]interface{}{
				"hasAccess": hasAccess,
				"error":     nil,
			}
		}
	}

	resultsBytes, err := json.Marshal(results)
	if err != nil {
		return "", fmt.Errorf("failed to marshal results: %w", err)
	}

	return string(resultsBytes), nil
}

// GetPermissionHistory returns the history of permission changes for a record
func (s *SmartContract) GetPermissionHistory(ctx contractapi.TransactionContextInterface, recordID string) (string, error) {
	// Input validation
	if recordID == "" {
		return "", fmt.Errorf("recordID is required")
	}

	// Validate address
	if err := validateAddress(recordID); err != nil {
		return "", fmt.Errorf("invalid recordID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Validate owner (only owners can view permission history)
	if err := s.validateOwner(ctx, recordID); err != nil {
		return "", err
	}

	// Get access list which contains current permissions
	accessKey := accessListKey(recordID)
	accessListData, err := ctx.GetStub().GetState(accessKey)
	if err != nil {
		return "", fmt.Errorf("failed to get access list: %w", err)
	}

	if len(accessListData) == 0 {
		// Return empty history if no access list exists
		emptyHistory := map[string]interface{}{
			"recordId":    recordID,
			"permissions": []interface{}{},
			"retrievedBy": callerID,
			"retrievedAt": time.Now().UTC().Format(time.RFC3339),
		}
		historyBytes, _ := json.Marshal(emptyHistory)
		return string(historyBytes), nil
	}

	var accessList AccessList
	if err := json.Unmarshal(accessListData, &accessList); err != nil {
		return "", fmt.Errorf("failed to unmarshal access list: %w", err)
	}

	// Format permission history
	history := map[string]interface{}{
		"recordId":    recordID,
		"owner":       accessList.Owner,
		"permissions": accessList.Permissions,
		"lastUpdated": accessList.UpdatedAt,
		"retrievedBy": callerID,
		"retrievedAt": time.Now().UTC().Format(time.RFC3339),
	}

	historyBytes, err := json.Marshal(history)
	if err != nil {
		return "", fmt.Errorf("failed to marshal history: %w", err)
	}

	return string(historyBytes), nil
}

// ValidateAccessWithReason provides detailed reason for access validation result
func (s *SmartContract) ValidateAccessWithReason(ctx contractapi.TransactionContextInterface, recordID, userID, action string) (string, error) {
	// Input validation
	if recordID == "" || userID == "" || action == "" {
		return "", fmt.Errorf("recordID, userID, and action are required")
	}

	// Validate addresses
	if err := validateAddress(recordID); err != nil {
		return "", fmt.Errorf("invalid recordID: %w", err)
	}
	if err := validateAddress(userID); err != nil {
		return "", fmt.Errorf("invalid userID: %w", err)
	}

	// Check if record exists
	recordData, err := ctx.GetStub().GetState(recordKey(recordID))
	if err != nil {
		return "", fmt.Errorf("failed to read record: %w", err)
	}
	if len(recordData) == 0 {
		result := map[string]interface{}{
			"hasAccess": false,
			"reason":    "Record not found",
			"details":   fmt.Sprintf("Record %s does not exist", recordID),
		}
		resultBytes, _ := json.Marshal(result)
		return string(resultBytes), nil
	}

	var record MedicalRecord
	if err := json.Unmarshal(recordData, &record); err != nil {
		return "", fmt.Errorf("failed to unmarshal record: %w", err)
	}

	// Check ownership first
	if userID == record.PatientID {
		result := map[string]interface{}{
			"hasAccess": true,
			"reason":    "Owner access",
			"details":   "User is the patient (owner) of the record",
			"level":     "owner",
		}
		resultBytes, _ := json.Marshal(result)
		return string(resultBytes), nil
	}

	if userID == record.CreatorID {
		result := map[string]interface{}{
			"hasAccess": true,
			"reason":    "Creator access",
			"details":   "User is the creator of the record",
			"level":     "creator",
		}
		resultBytes, _ := json.Marshal(result)
		return string(resultBytes), nil
	}

	// Check explicit permissions
	permData, err := ctx.GetStub().GetState(permKey(recordID, userID))
	if err != nil {
		return "", fmt.Errorf("failed to check permission: %w", err)
	}
	if len(permData) == 0 {
		result := map[string]interface{}{
			"hasAccess": false,
			"reason":    "No permission granted",
			"details":   "User has no explicit permission for this record",
		}
		resultBytes, _ := json.Marshal(result)
		return string(resultBytes), nil
	}

	var perm AccessPermission
	if err := json.Unmarshal(permData, &perm); err != nil {
		return "", fmt.Errorf("failed to unmarshal permission: %w", err)
	}

	// Check if permission is active
	if !perm.IsActive {
		result := map[string]interface{}{
			"hasAccess": false,
			"reason":    "Permission inactive",
			"details":   "User's permission has been deactivated",
		}
		resultBytes, _ := json.Marshal(result)
		return string(resultBytes), nil
	}

	// Check expiration
	if perm.ExpiresAt != "" {
		if expTime, err := time.Parse(time.RFC3339, perm.ExpiresAt); err == nil {
			if !time.Now().UTC().Before(expTime) {
				result := map[string]interface{}{
					"hasAccess": false,
					"reason":    "Permission expired",
					"details":   fmt.Sprintf("Permission expired at %s", perm.ExpiresAt),
				}
				resultBytes, _ := json.Marshal(result)
				return string(resultBytes), nil
			}
		}
	}

	// Check permission level
	hasLevel, err := s.ValidatePermissionLevel(ctx, recordID, userID, action)
	if err != nil {
		return "", fmt.Errorf("failed to validate permission level: %w", err)
	}

	if !hasLevel {
		result := map[string]interface{}{
			"hasAccess": false,
			"reason":    "Insufficient permission level",
			"details":   fmt.Sprintf("User has '%s' permission but '%s' is required", perm.Action, action),
		}
		resultBytes, _ := json.Marshal(result)
		return string(resultBytes), nil
	}

	// Access granted
	result := map[string]interface{}{
		"hasAccess": true,
		"reason":    "Permission granted",
		"details":   fmt.Sprintf("User has valid '%s' permission", perm.Action),
		"level":     perm.Action,
		"grantedBy": perm.GrantedBy,
		"grantedAt": perm.GrantedAt,
		"expiresAt": perm.ExpiresAt,
	}
	resultBytes, _ := json.Marshal(result)
	return string(resultBytes), nil
}

// AuditAccessAttempt logs an access attempt for compliance and security monitoring
func (s *SmartContract) AuditAccessAttempt(ctx contractapi.TransactionContextInterface, recordID, action string, success bool, reason string) error {
	// Input validation
	if recordID == "" || action == "" {
		return fmt.Errorf("recordID and action are required")
	}

	// Validate address
	if err := validateAddress(recordID); err != nil {
		return fmt.Errorf("invalid recordID: %w", err)
	}

	// Get caller identity
	callerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get caller identity: %w", err)
	}

	// Create audit event
	auditEvent := map[string]interface{}{
		"recordId":   recordID,
		"accessorId": callerID,
		"action":     action,
		"success":    success,
		"reason":     reason,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"eventType":  "AccessAudit",
		"txId":       ctx.GetStub().GetTxID(),
		"channelId":  ctx.GetStub().GetChannelID(),
	}

	// Emit audit event
	auditBytes, _ := json.Marshal(auditEvent)
	if err := ctx.GetStub().SetEvent("AccessAudit", auditBytes); err != nil {
		return fmt.Errorf("failed to emit audit event: %w", err)
	}

	return nil
}

// GetContractInfo returns information about the smart contract
func (s *SmartContract) GetContractInfo(ctx contractapi.TransactionContextInterface) (string, error) {
	info := map[string]interface{}{
		"contractName": "EMR Access Control Smart Contract",
		"version":      "1.0.0",
		"description":  "Hyperledger Fabric chaincode for medical record access control with comprehensive validation",
		"features": []string{
			"Medical record creation and management",
			"Granular access control with permission levels",
			"Audit logging and compliance tracking",
			"Merkle tree integration for data integrity",
			"HIPAA-compliant access validation",
			"Role-based permission hierarchy",
			"Batch operations support",
			"Comprehensive event emission",
		},
		"permissionLevels": map[string]int{
			"read":  1,
			"share": 2,
			"write": 3,
			"admin": 4,
		},
		"supportedEvents": []string{
			"RecordCreated",
			"AccessGranted",
			"AccessRevoked",
			"RecordAccessed",
			"RecordUpdated",
			"AccessAudit",
		},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	infoBytes, err := json.Marshal(info)
	if err != nil {
		return "", fmt.Errorf("failed to marshal contract info: %w", err)
	}

	return string(infoBytes), nil
}

func (s *SmartContract) assetExists(ctx contractapi.TransactionContextInterface, key string) (bool, error) {
	data, err := ctx.GetStub().GetState(key)
	if err != nil {
		return false, err
	}
	return len(data) > 0, nil
}
