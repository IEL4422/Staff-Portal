import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { masterListApi, tasksApi } from '../services/api';

const DataCacheContext = createContext(null);

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

export const DataCacheProvider = ({ children }) => {
  // Cached data
  const [matters, setMatters] = useState([]);
  const [assignees, setAssignees] = useState([]);
  
  // Loading states
  const [loadingMatters, setLoadingMatters] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  
  // Cache timestamps using refs (to avoid dependency cycles)
  const mattersLastFetched = useRef(null);
  const assigneesLastFetched = useRef(null);
  const mattersCache = useRef([]);
  const assigneesCache = useRef([]);
  
  // Track initial fetch
  const initialFetchDone = useRef(false);

  const fetchMatters = useCallback(async (force = false) => {
    // Return cached data if still valid
    if (!force && mattersCache.current.length > 0 && mattersLastFetched.current) {
      const cacheAge = Date.now() - mattersLastFetched.current;
      if (cacheAge < CACHE_DURATION) {
        return mattersCache.current;
      }
    }

    setLoadingMatters(true);
    try {
      const response = await masterListApi.getAllMatters();
      const records = response.data.records || [];
      const sortedMatters = records
        .map(r => ({
          id: r.id,
          name: r.fields?.['Matter Name'] || r.fields?.Client || 'Unknown',
          type: r.fields?.['Type of Case'] || '',
          client: r.fields?.Client || ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      mattersCache.current = sortedMatters;
      mattersLastFetched.current = Date.now();
      setMatters(sortedMatters);
      console.log(`[DataCache] Loaded ${sortedMatters.length} matters`);
      return sortedMatters;
    } catch (error) {
      console.error('[DataCache] Failed to fetch matters:', error);
      return mattersCache.current; // Return cached data on error
    } finally {
      setLoadingMatters(false);
    }
  }, []);

  const fetchAssignees = useCallback(async (force = false) => {
    // Return cached data if still valid
    if (!force && assigneesCache.current.length > 0 && assigneesLastFetched.current) {
      const cacheAge = Date.now() - assigneesLastFetched.current;
      if (cacheAge < CACHE_DURATION) {
        return assigneesCache.current;
      }
    }

    setLoadingAssignees(true);
    try {
      const response = await tasksApi.getAssignees();
      const assigneeList = response.data.assignees || [];
      assigneesCache.current = assigneeList;
      assigneesLastFetched.current = Date.now();
      setAssignees(assigneeList);
      console.log(`[DataCache] Loaded ${assigneeList.length} assignees`);
      return assigneeList;
    } catch (error) {
      console.error('[DataCache] Failed to fetch assignees:', error);
      return assigneesCache.current; // Return cached data on error
    } finally {
      setLoadingAssignees(false);
    }
  }, []);

  // Pre-fetch data on mount
  useEffect(() => {
    // Only fetch once on mount if we have a token
    if (initialFetchDone.current) return;
    
    const token = localStorage.getItem('token');
    if (token) {
      initialFetchDone.current = true;
      fetchMatters();
      fetchAssignees();
    }
  }, [fetchMatters, fetchAssignees]);

  const refreshCache = useCallback(async () => {
    await Promise.all([
      fetchMatters(true),
      fetchAssignees(true)
    ]);
  }, [fetchMatters, fetchAssignees]);

  const value = {
    // Data
    matters,
    assignees,
    
    // Loading states
    loadingMatters,
    loadingAssignees,
    
    // Methods
    fetchMatters,
    fetchAssignees,
    refreshCache,
    
    // Cache info (expose timestamps as values for components)
    mattersLastFetched: mattersLastFetched.current,
    assigneesLastFetched: assigneesLastFetched.current,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

export default DataCacheContext;
