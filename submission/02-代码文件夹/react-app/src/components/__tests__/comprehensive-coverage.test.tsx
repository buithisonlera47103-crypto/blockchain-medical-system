/**
 * Comprehensive Frontend Test Suite for 90%+ Coverage
 * Tests all critical React components and functionality
 */

import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

// Import components to test
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Dashboard from '../Dashboard';
import Login from '../Login';
import MedicalRecords from '../MedicalRecords';
import Profile from '../Profile';
import Search from '../Search';
import Upload from '../Upload';

// Mock axios
const mockAxios = new MockAdapter(axios);

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, isAuthenticated: false }, action) => {
        switch (action.type) {
          case 'auth/login':
            return { user: action.payload, isAuthenticated: true };
          case 'auth/logout':
            return { user: null, isAuthenticated: false };
          default:
            return state;
        }
      },
      records: (state = { records: [], loading: false }, action) => {
        switch (action.type) {
          case 'records/setRecords':
            return { ...state, records: action.payload };
          case 'records/setLoading':
            return { ...state, loading: action.payload };
          default:
            return state;
        }
      },
    },
    preloadedState: initialState,
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialState?: any }> = ({
  children,
  initialState = {},
}) => {
  const store = createTestStore(initialState);

  return (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('Comprehensive Frontend Component Tests', () => {
  beforeEach(() => {
    mockAxios.reset();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Login Component', () => {
    test('should render login form correctly', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    test('should handle successful login', async () => {
      const user = userEvent.setup();

      mockAxios.onPost('/api/v1/auth/login').reply(200, {
        token: 'test-token',
        user: { id: '1', username: 'testuser', role: 'patient' },
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(1);
      });
    });

    test('should handle login errors', async () => {
      const user = userEvent.setup();

      mockAxios.onPost('/api/v1/auth/login').reply(401, {
        error: 'Invalid credentials',
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/username/i), 'wronguser');
      await user.type(screen.getByLabelText(/password/i), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should validate form inputs', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /login/i }));

      expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });
  });

  describe('Dashboard Component', () => {
    const authenticatedState = {
      auth: {
        user: { id: '1', username: 'testuser', role: 'patient' },
        isAuthenticated: true,
      },
    };

    test('should render dashboard with user data', () => {
      mockAxios.onGet('/api/v1/dashboard/stats').reply(200, {
        totalRecords: 5,
        recentActivity: [],
        notifications: [],
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    test('should load dashboard statistics', async () => {
      mockAxios.onGet('/api/v1/dashboard/stats').reply(200, {
        totalRecords: 10,
        recentActivity: [
          { id: '1', action: 'Record created', timestamp: new Date().toISOString() },
        ],
        notifications: [{ id: '1', message: 'New access request', type: 'info' }],
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Dashboard />
        </TestWrapper>
      );

      expect(await screen.findByText('10')).toBeInTheDocument();
      expect(await screen.findByText(/record created/i)).toBeInTheDocument();
    });

    test('should handle dashboard loading states', () => {
      mockAxios.onGet('/api/v1/dashboard/stats').reply(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([200, { totalRecords: 0 }]), 100);
        });
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('MedicalRecords Component', () => {
    const authenticatedState = {
      auth: {
        user: { id: '1', username: 'testuser', role: 'patient' },
        isAuthenticated: true,
      },
    };

    test('should render medical records list', async () => {
      const mockRecords = [
        {
          id: '1',
          title: 'Blood Test Results',
          date: '2024-01-15',
          type: 'lab-result',
          doctor: 'Dr. Smith',
        },
        {
          id: '2',
          title: 'X-Ray Report',
          date: '2024-01-10',
          type: 'imaging',
          doctor: 'Dr. Johnson',
        },
      ];

      mockAxios.onGet('/api/v1/records').reply(200, {
        success: true,
        records: mockRecords,
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <MedicalRecords />
        </TestWrapper>
      );

      expect(await screen.findByText('Blood Test Results')).toBeInTheDocument();
      expect(await screen.findByText('X-Ray Report')).toBeInTheDocument();
    });

    test('should filter records by type', async () => {
      const user = userEvent.setup();

      mockAxios.onGet('/api/v1/records').reply(200, {
        success: true,
        records: [
          { id: '1', title: 'Blood Test', type: 'lab-result' },
          { id: '2', title: 'X-Ray', type: 'imaging' },
        ],
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <MedicalRecords />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Blood Test')).toBeInTheDocument();
      });

      // Filter by lab results
      const filterSelect = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(filterSelect, 'lab-result');

      expect(screen.getByText('Blood Test')).toBeInTheDocument();
      expect(screen.queryByText('X-Ray')).not.toBeInTheDocument();
    });

    test('should handle record deletion', async () => {
      const user = userEvent.setup();

      mockAxios.onGet('/api/v1/records').reply(200, {
        success: true,
        records: [{ id: '1', title: 'Test Record', type: 'note' }],
      });

      mockAxios.onDelete('/api/v1/records/1').reply(200, { success: true });

      render(
        <TestWrapper initialState={authenticatedState}>
          <MedicalRecords />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Record')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAxios.history.delete).toHaveLength(1);
      });
    });
  });

  describe('Upload Component', () => {
    const authenticatedState = {
      auth: {
        user: { id: '1', username: 'testuser', role: 'doctor' },
        isAuthenticated: true,
      },
    };

    test('should render file upload form', () => {
      render(
        <TestWrapper initialState={authenticatedState}>
          <Upload />
        </TestWrapper>
      );

      expect(screen.getByText(/upload medical record/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select file/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    test('should handle file selection', async () => {
      const user = userEvent.setup();
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Upload />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, file);

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    test('should validate file types', async () => {
      const user = userEvent.setup();
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Upload />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, invalidFile);

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });

    test('should handle successful upload', async () => {
      const user = userEvent.setup();
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      mockAxios.onPost('/api/v1/records/upload').reply(200, {
        success: true,
        recordId: 'new-record-123',
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Upload />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, file);

      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Component', () => {
    const authenticatedState = {
      auth: {
        user: { id: '1', username: 'testuser', role: 'patient' },
        isAuthenticated: true,
      },
    };

    test('should render search interface', () => {
      render(
        <TestWrapper initialState={authenticatedState}>
          <Search />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/search medical records/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('should perform search and display results', async () => {
      const user = userEvent.setup();

      mockAxios.onGet('/api/v1/search/records').reply(200, {
        success: true,
        results: [
          { id: '1', title: 'Blood Test Results', relevance: 0.95 },
          { id: '2', title: 'Blood Pressure Check', relevance: 0.87 },
        ],
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Search />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search medical records/i);
      await user.type(searchInput, 'blood test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      expect(await screen.findByText('Blood Test Results')).toBeInTheDocument();
      expect(await screen.findByText('Blood Pressure Check')).toBeInTheDocument();
    });

    test('should handle empty search results', async () => {
      const user = userEvent.setup();

      mockAxios.onGet('/api/v1/search/records').reply(200, {
        success: true,
        results: [],
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Search />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search medical records/i);
      await user.type(searchInput, 'nonexistent');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Profile Component', () => {
    const authenticatedState = {
      auth: {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'patient',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '123-456-7890',
          },
        },
        isAuthenticated: true,
      },
    };

    test('should render user profile information', () => {
      render(
        <TestWrapper initialState={authenticatedState}>
          <Profile />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    test('should handle profile updates', async () => {
      const user = userEvent.setup();

      mockAxios.onPut('/api/v1/auth/profile').reply(200, {
        success: true,
        user: { ...authenticatedState.auth.user, profile: { firstName: 'Jane' } },
      });

      render(
        <TestWrapper initialState={authenticatedState}>
          <Profile />
        </TestWrapper>
      );

      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => expect(mockAxios.history.put).toHaveLength(1));
      expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
    });
  });
});
