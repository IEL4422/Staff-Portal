"""Airtable cache utility for caching Master List and Assignees data"""

from typing import List, Dict, Optional
from datetime import datetime, timezone
import asyncio
import httpx
import logging
import os

logger = logging.getLogger(__name__)

AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY', '')
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID', '')
AIRTABLE_BASE_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}"


class AirtableCache:
    """In-memory cache for Airtable data with automatic refresh"""
    
    def __init__(self):
        self.master_list: List[Dict] = []
        self.master_list_updated: Optional[datetime] = None
        self.assignees: List[str] = []
        self.assignees_updated: Optional[datetime] = None
        self.cache_ttl_seconds = 300  # 5 minutes TTL
        self._lock = asyncio.Lock()
        self._refresh_task: Optional[asyncio.Task] = None
    
    def is_stale(self, updated_at: Optional[datetime]) -> bool:
        """Check if cache data is stale"""
        if updated_at is None:
            return True
        age = (datetime.now(timezone.utc) - updated_at).total_seconds()
        return age > self.cache_ttl_seconds
    
    async def fetch_all_master_list_from_airtable(self) -> List[Dict]:
        """Fetch ALL records from Airtable Master List with proper pagination"""
        all_records = []
        offset = None
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {
                'Authorization': f'Bearer {AIRTABLE_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            while True:
                url = f'{AIRTABLE_BASE_URL}/Master%20List'
                if offset:
                    url += f'?offset={offset}'
                
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    logger.error(f"Airtable request failed: {response.status_code} - {response.text}")
                    break
                
                data = response.json()
                records = data.get('records', [])
                all_records.extend(records)
                
                offset = data.get('offset')
                if not offset:
                    break
        
        logger.info(f"[AirtableCache] Fetched {len(all_records)} master list records from Airtable")
        return all_records
    
    async def fetch_assignees_from_airtable(self) -> List[str]:
        """Fetch unique assignees from Tasks table"""
        assignees_set = set()
        offset = None
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {
                'Authorization': f'Bearer {AIRTABLE_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            while True:
                url = f'{AIRTABLE_BASE_URL}/Tasks?fields%5B%5D=Assigned%20To'
                if offset:
                    url += f'&offset={offset}'
                
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    logger.warning(f"Failed to fetch assignees: {response.status_code}")
                    break
                
                data = response.json()
                for record in data.get('records', []):
                    assigned_to = record.get('fields', {}).get('Assigned To')
                    if assigned_to:
                        assignees_set.add(assigned_to)
                
                offset = data.get('offset')
                if not offset:
                    break
        
        assignees = sorted(list(assignees_set))
        logger.info(f"[AirtableCache] Fetched {len(assignees)} unique assignees from Airtable")
        return assignees
    
    async def get_master_list(self, force_refresh: bool = False) -> List[Dict]:
        """Get master list from cache, refreshing if stale"""
        async with self._lock:
            if force_refresh or self.is_stale(self.master_list_updated):
                self.master_list = await self.fetch_all_master_list_from_airtable()
                self.master_list_updated = datetime.now(timezone.utc)
            return self.master_list
    
    async def get_assignees(self, force_refresh: bool = False) -> List[str]:
        """Get assignees from cache, refreshing if stale"""
        async with self._lock:
            if force_refresh or self.is_stale(self.assignees_updated):
                self.assignees = await self.fetch_assignees_from_airtable()
                self.assignees_updated = datetime.now(timezone.utc)
            return self.assignees
    
    async def refresh_all(self):
        """Refresh all cached data"""
        logger.info("[AirtableCache] Starting full cache refresh...")
        await self.get_master_list(force_refresh=True)
        await self.get_assignees(force_refresh=True)
        logger.info("[AirtableCache] Full cache refresh complete")
    
    def get_cache_status(self) -> Dict:
        """Get current cache status"""
        return {
            "master_list_count": len(self.master_list),
            "master_list_updated": self.master_list_updated.isoformat() if self.master_list_updated else None,
            "assignees_count": len(self.assignees),
            "assignees_updated": self.assignees_updated.isoformat() if self.assignees_updated else None,
            "cache_ttl_seconds": self.cache_ttl_seconds
        }


# Global cache instance
airtable_cache = AirtableCache()
