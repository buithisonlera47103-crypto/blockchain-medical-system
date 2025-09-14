/**
 * Enhanced Search Interface Component
 * Provides advanced search capabilities with encrypted search support
 */

import {
  Search,
  FilterList,
  Clear,
  Save,
  Person,
  Visibility,
  Download,
  Share,
  Star,
  StarBorder,
  VpnKey,
  Shield,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Avatar,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Skeleton,
  Alert,
  Pagination,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';

// Enhanced interfaces for search functionality
export interface SearchFilters {
  patientName?: string;
  patientId?: string;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  provider?: string;
  facility?: string;
  diagnosis?: string[];
  medications?: string[];
  procedures?: string[];
  recordType?: string[];
  encryptionStatus?: 'all' | 'encrypted' | 'decrypted';
  fhirCompliant?: boolean | null;
  accessLevel?: 'all' | 'read' | 'write' | 'admin';
}

export interface SearchResult {
  id: string;
  patientName: string;
  patientId: string;
  visitDate: string;
  provider: string;
  facility: string;
  diagnosis: string;
  recordType: string;
  encryptionStatus: 'encrypted' | 'decrypted';
  fhirCompliant: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed: string;
  relevanceScore: number;
  highlights: string[];
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdDate: string;
  lastUsed: string;
  useCount: number;
  isStarred: boolean;
}

export interface SearchStats {
  totalResults: number;
  encryptedResults: number;
  fhirCompliantResults: number;
  averageRelevanceScore: number;
  searchTime: number;
  cacheHitRate: number;
}

const EnhancedSearchInterface: React.FC = () => {

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(10);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const handleSelectResult = (id: string, checked: boolean) => {
    setSelectedResults(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  };
  const skeletonKeys = useMemo(() => Array.from({ length: 3 }, (_, i) => `sk-${i}`), []);

  // Mock data for demonstration
  const mockProviders = useMemo(() => ['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Emily Davis'], []);
  const mockFacilities = useMemo(
    () => ['General Hospital', 'City Medical Center', 'Regional Clinic'],
    []
  );
  const mockDiagnoses = useMemo(
    () => ['Hypertension', 'Diabetes', 'Pneumonia', 'Fracture'],
    []
  );


  // Perform search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() && Object.keys(filters).length === 0) return;

    setLoading(true);
    try {
      // Mock search results - replace with actual API call
      const mockResults: SearchResult[] = Array.from({ length: 25 }, (_, i) => ({
        id: `record-${i + 1}`,
        patientName: `Patient ${i + 1}`,
        patientId: `P${String(i + 1).padStart(6, '0')}`,
        visitDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        provider: mockProviders[Math.floor(Math.random() * mockProviders.length)],
        facility: mockFacilities[Math.floor(Math.random() * mockFacilities.length)],
        diagnosis: mockDiagnoses[Math.floor(Math.random() * mockDiagnoses.length)],
        recordType: ['Consultation', 'Lab Report', 'Imaging', 'Procedure'][
          Math.floor(Math.random() * 4)
        ],
        encryptionStatus: Math.random() > 0.3 ? 'encrypted' : 'decrypted',
        fhirCompliant: Math.random() > 0.2,
        accessLevel: ['read', 'write', 'admin'][Math.floor(Math.random() * 3)] as
          | 'read'
          | 'write'
          | 'admin',
        lastAccessed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        relevanceScore: Math.random() * 100,
        highlights: [`Matched: ${searchQuery}`, 'Relevant content found'],
      }));

      const mockStats: SearchStats = {
        totalResults: mockResults.length,
        encryptedResults: mockResults.filter(r => r.encryptionStatus === 'encrypted').length,
        fhirCompliantResults: mockResults.filter(r => r.fhirCompliant).length,
        averageRelevanceScore:
          mockResults.reduce((sum, r) => sum + r.relevanceScore, 0) / mockResults.length,
        searchTime: Math.random() * 500 + 100,
        cacheHitRate: Math.random() * 100,
      };

      setResults(mockResults);
      setSearchStats(mockStats);


    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, mockProviders, mockFacilities, mockDiagnoses]);

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setResults([]);
    setSearchStats(null);
  };

  // Save current search
  const saveCurrentSearch = () => {
    const newSavedSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: searchQuery || 'Advanced Search',
      filters,
      createdDate: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 1,
      isStarred: false,
    };
    setSavedSearches(prev => [newSavedSearch, ...prev]);
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.name);
    setFilters(savedSearch.filters);
    // Update usage stats
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === savedSearch.id
          ? { ...s, lastUsed: new Date().toISOString(), useCount: s.useCount + 1 }
          : s
      )
    );
  };

  // Toggle star on saved search
  const toggleStarSearch = (searchId: string) => {
    setSavedSearches(prev =>
      prev.map(s => (s.id === searchId ? { ...s, isStarred: !s.isStarred } : s))
    );
  };

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    return results.slice(startIndex, startIndex + resultsPerPage);
  }, [results, currentPage, resultsPerPage]);

  // Render search stats
  const renderSearchStats = () => {
    if (!searchStats) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {searchStats.totalResults}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Results
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {searchStats.encryptedResults}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Encrypted
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="info.main">
                  {searchStats.fhirCompliantResults}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  FHIR Compliant
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">
                  {searchStats.searchTime.toFixed(0)}ms
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Search Time
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Render search result item
  const renderSearchResult = (result: SearchResult) => (
    <Card key={result.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
          <Box display="flex" alignItems="center" flex={1}>
            <Checkbox
              checked={selectedResults.includes(result.id)}
              onChange={e => handleSelectResult(result.id, e.target.checked)}
            />
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <Person />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" component="div">
                {result.patientName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {result.patientId} • {new Date(result.visitDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={result.encryptionStatus}
              color={result.encryptionStatus === 'encrypted' ? 'success' : 'info'}
              size="small"
              icon={result.encryptionStatus === 'encrypted' ? <Shield /> : <VpnKey />}
            />
            <Chip
              label={result.fhirCompliant ? 'FHIR' : 'Non-FHIR'}
              color={result.fhirCompliant ? 'success' : 'warning'}
              size="small"
            />
            <IconButton size="small">
              <Visibility />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Provider:</strong> {result.provider}
            </Typography>
            <Typography variant="body2">
              <strong>Facility:</strong> {result.facility}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Diagnosis:</strong> {result.diagnosis}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {result.recordType}
            </Typography>
          </Grid>
        </Grid>

        {result.highlights.length > 0 && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Highlights:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
              {result.highlights.map(highlight => (
                <Chip
                  key={highlight}
                  label={highlight}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        )}

        <Box display="flex" alignItems="center" justifyContent="between" mt={2}>
          <Typography variant="caption" color="text.secondary">
            Relevance: {result.relevanceScore.toFixed(1)}% • Last accessed:{' '}
            {new Date(result.lastAccessed).toLocaleDateString()}
          </Typography>
          <Box display="flex" gap={1}>
            <Button size="small" startIcon={<Download />}>
              Export
            </Button>
            <Button size="small" startIcon={<Share />}>
              Share
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Search Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold" mb={2}>
          Enhanced Search
        </Typography>

        {/* Main Search Bar */}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            fullWidth
            placeholder="Search medical records, patients, diagnoses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && performSearch()}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <Clear />
                </IconButton>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={performSearch}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {/* Quick Actions */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterList />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            Advanced Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Save />}
            onClick={saveCurrentSearch}
            disabled={!searchQuery && Object.keys(filters).length === 0}
          >
            Save Search
          </Button>
          <Button variant="outlined" size="small" startIcon={<Clear />} onClick={clearFilters}>
            Clear All
          </Button>
        </Box>
      </Box>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Accordion expanded sx={{ mb: 3 }}>
          <AccordionSummary>
            <Typography variant="h6">Advanced Search Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Patient Name"
                  value={filters.patientName || ''}
                  onChange={e => handleFilterChange('patientName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Patient ID"
                  value={filters.patientId || ''}
                  onChange={e => handleFilterChange('patientId', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete
                  options={mockProviders}
                  value={filters.provider || null}
                  onChange={(_, value) => handleFilterChange('provider', value)}
                  renderInput={params => <TextField {...params} label="Provider" />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete
                  options={mockFacilities}
                  value={filters.facility || null}
                  onChange={(_, value) => handleFilterChange('facility', value)}
                  renderInput={params => <TextField {...params} label="Facility" />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Encryption Status</InputLabel>
                  <Select
                    value={filters.encryptionStatus || 'all'}
                    onChange={e => handleFilterChange('encryptionStatus', e.target.value)}
                  >
                    <MenuItem value="all">All Records</MenuItem>
                    <MenuItem value="encrypted">Encrypted Only</MenuItem>
                    <MenuItem value="decrypted">Decrypted Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.fhirCompliant === true}
                      onChange={e =>
                        handleFilterChange('fhirCompliant', e.target.checked ? true : null)
                      }
                    />
                  }
                  label="FHIR Compliant Only"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Saved Searches
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {savedSearches.slice(0, 5).map(savedSearch => (
                <Chip
                  key={savedSearch.id}
                  label={savedSearch.name}
                  onClick={() => loadSavedSearch(savedSearch)}
                  onDelete={() => toggleStarSearch(savedSearch.id)}
                  deleteIcon={savedSearch.isStarred ? <Star /> : <StarBorder />}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search Stats */}
      {renderSearchStats()}

      {/* Search Results */}
      {results.length > 0 && (
        <Box>
          <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
            <Typography variant="h6">Search Results ({results.length})</Typography>
            {selectedResults.length > 0 && (
              <Box display="flex" gap={1}>
                <Button variant="outlined" size="small" startIcon={<Download />}>
                  Export Selected ({selectedResults.length})
                </Button>
                <Button variant="outlined" size="small" startIcon={<Share />}>
                  Share Selected
                </Button>
              </Box>
            )}
          </Box>

          {/* Results List */}
          {loading
            ? skeletonKeys.map(k => (
                <Skeleton key={k} variant="rectangular" height={200} sx={{ mb: 2 }} />
              ))
            : paginatedResults.map(renderSearchResult)}

          {/* Pagination */}
          {results.length > resultsPerPage && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(results.length / resultsPerPage)}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && searchQuery && (
        <Alert severity="info">
          No results found for "{searchQuery}". Try adjusting your search terms or filters.
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedSearchInterface;
