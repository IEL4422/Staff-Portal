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
  
  // Cache timestamps (for potential refresh logic)
  const [mattersLastFetched, setMattersLastFetched] = useState(null);
  const [assigneesLastFetched, setAssigneesLastFetched] = useState(null);
  
  // Use refs to track if initial fetch has been done
  const initialFetchDone = useRef(false);

  const fetchMatters = useCallback(async (force = false) => {
    // Return cached data if still valid (use functional update to check state)
    const currentTime = Date.now();
    
    // We need to check within setState to get current values
    return new Promise((resolve) => {
      setMatters(currentMatters => {
        setMattersLastFetched(currentLastFetched => {
          // Check cache validity
          if (!force && currentMatters.length > 0 && currentLastFetched) {
            const cacheAge = currentTime - currentLastFetched;
            if (cacheAge < CACHE_DURATION) {
              resolve(currentMatters);
              return currentLastFetched;
            }
          }
          
          // Need to fetch - do it outside setState
          setLoadingMatters(true);
          masterListApi.getAllMatters()
            .then(response => {
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
              resolve(sortedMatters);
            })
            .catch(error => {
              console.error('[DataCache] Failed to fetch matters:', error);
              resolve(currentMatters);
            })
            .finally(() => {
              setLoadingMatters(false);
            });
          
          return currentLastFetched;
        });
        return currentMatters;
      });
    });
  }, []);

  const fetchAssignees = useCallback(async (force = false) => {
    const currentTime = Date.now();
    
    return new Promise((resolve) => {
      setAssignees(currentAssignees => {
        setAssigneesLastFetched(currentLastFetched => {
          // Check cache validity
          if (!force && currentAssignees.length > 0 && currentLastFetched) {
            const cacheAge = currentTime - currentLastFetched;
            if (cacheAge < CACHE_DURATION) {
              resolve(currentAssignees);
              return currentLastFetched;
            }
          }
          
          // Need to fetch
          setLoadingAssignees(true);
          tasksApi.getAssignees()
            .then(response => {
              const assigneeList = response.data.assignees || [];
              setAssignees(assigneeList);
              setAssigneesLastFetched(Date.now());
              console.log(`[DataCache] Loaded ${assigneeList.length} assignees`);
              resolve(assigneeList);
            })
            .catch(error => {
              console.error('[DataCache] Failed to fetch assignees:', error);
              resolve(currentAssignees);
            })
            .finally(() => {
              setLoadingAssignees(false);
            });
          
          return currentLastFetched;
        });
        return currentAssignees;
      });
    });
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
