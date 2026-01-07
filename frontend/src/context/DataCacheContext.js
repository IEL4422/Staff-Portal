import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { masterListApi, tasksApi } from '../services/api';

const DataCacheContext = createContext(null);

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
  
  // Cache timestamps (for potential refresh logic)
  const [mattersLastFetched, setMattersLastFetched] = useState(null);
  const [assigneesLastFetched, setAssigneesLastFetched] = useState(null);
  
  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  const fetchMatters = useCallback(async (force = false) => {
    // Return cached data if still valid
    if (!force && matters.length > 0 && mattersLastFetched) {
      const cacheAge = Date.now() - mattersLastFetched;
      if (cacheAge < CACHE_DURATION) {
        return matters;
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
      
      setMatters(sortedMatters);
      setMattersLastFetched(Date.now());
      console.log(`[DataCache] Loaded ${sortedMatters.length} matters`);
      return sortedMatters;
    } catch (error) {
      console.error('[DataCache] Failed to fetch matters:', error);
      return matters; // Return cached data on error
    } finally {
      setLoadingMatters(false);
    }
  }, [matters, mattersLastFetched]);

  const fetchAssignees = useCallback(async (force = false) => {
    // Return cached data if still valid
    if (!force && assignees.length > 0 && assigneesLastFetched) {
      const cacheAge = Date.now() - assigneesLastFetched;
      if (cacheAge < CACHE_DURATION) {
        return assignees;
      }
    }

    setLoadingAssignees(true);
    try {
      const response = await tasksApi.getAssignees();
      const assigneeList = response.data.assignees || [];
      setAssignees(assigneeList);
      setAssigneesLastFetched(Date.now());
      console.log(`[DataCache] Loaded ${assigneeList.length} assignees`);
      return assigneeList;
    } catch (error) {
      console.error('[DataCache] Failed to fetch assignees:', error);
      return assignees; // Return cached data on error
    } finally {
      setLoadingAssignees(false);
    }
  }, [assignees, assigneesLastFetched]);

  // Pre-fetch data on mount
  useEffect(() => {
    // Only fetch if we have a token (user is logged in)
    const token = localStorage.getItem('token');
    if (token) {
      fetchMatters();
      fetchAssignees();
    }
  }, []);

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
    
    // Cache info
    mattersLastFetched,
    assigneesLastFetched,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

export default DataCacheContext;
