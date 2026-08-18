# Better Guess Persistence Strategy

## Current State
- ✅ Guesses stored in localStorage (unreliable on mobile)
- ✅ Results submitted to Supabase at completion (via Edge Function)
- ✅ Database schema ready (results + guesses tables)
- ✅ Anonymous user ID stored in localStorage

## Proposed Solution: Hybrid Local-First with Server Sync

### Architecture
```
┌─────────────────────────────────────────┐
│   App Start                             │
├─────────────────────────────────────────┤
│ 1. Load from localStorage (instant)     │
│ 2. Fetch from Supabase (background)     │
│ 3. Merge/sync data                      │
│ 4. Use localStorage as cache            │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│   During Gameplay                       │
├─────────────────────────────────────────┤
│ 1. Update localStorage (instant)        │
│ 2. Debounce writes to Supabase (every   │
│    guess or every 30 seconds)           │
│ 3. Show sync status to user             │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│   Mode Completion                       │
├─────────────────────────────────────────┤
│ 1. Immediate Supabase write (full data) │
│ 2. Keep localStorage in sync            │
│ 3. Mark as "submitted"                  │
└─────────────────────────────────────────┘
```

## Benefits

1. **Offline-first**: Still works without internet
2. **Cross-device sync**: Data carries over when logging into another device
3. **Quota-proof**: Server handles data integrity, not limited by mobile storage
4. **Consistency**: Single source of truth is the database
5. **Resilience**: Lost mobile data can be recovered from server
6. **No authentication needed**: Use anonymous ID (already implemented)

## Implementation Approach

### Phase 1: Load Guesses from Server (Recommended First Step)
```typescript
// On app mount:
1. Get anon_id from localStorage
2. Fetch today's results from Supabase using existing Edge Function
3. If results exist, load guesses from them
4. Fall back to localStorage if not found
5. Merge/reconcile if both have data
```

### Phase 2: Periodic Sync of Guesses (Optional Enhancement)
```typescript
// On every guess + debounce:
1. Write to localStorage (instant)
2. Debounce 3-5 seconds
3. POST guesses to a new Edge Function endpoint
4. Show sync status badge to user
```

### Phase 3: Server Reconciliation (Optional)
```typescript
// When data conflicts:
- Take whichever dataset is more complete
- Timestamps could disambiguate
- Server has final authority
```

## Recommended Implementation Path

### Step 1: Create Load Function (Low Risk)
Create `src/utils/loadGuessesFomServer.ts`:
```typescript
async function loadGuesseFromServer(anonId: string, pokledleNumber: number) {
  const url = `${SUPABASE_URL}/functions/v1/pokedle-results?pokedle_number=${pokledleNumber}&include_guesses=true&guesses_limit=500`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  
  if (!response.ok) return null;
  
  const { results, guesses } = await response.json();
  
  if (!results?.length) return null;
  const result = results[0];
  
  // Transform guesses from server format to app format
  // Server: { mode, guess_number, guess, correct }
  // App: { name, id, ... }
  return reconstructGuessesByPage(result, guesses);
}
```

### Step 2: Load on App Mount
Modify `src/App.jsx` useState initializer:
```typescript
const [guessesByPage, setGuessesByPage] = useState(() => {
  // 1. Try localStorage first
  const fromStorage = loadFromLocalStorage();
  if (fromStorage) return fromStorage;
  
  // 2. Try server in background
  const anonId = getOrCreateAnonId();
  loadGuesseFromServer(anonId, pokledleNumber).then(fromServer => {
    if (fromServer) {
      setGuessesByPage(fromServer);
      // Also save to localStorage for next time
      localStorage.setItem('pokedle_guesses', JSON.stringify(...));
    }
  }).catch(() => {
    // Silently fail, we already have localStorage data
  });
  
  return fromStorage || defaultEmptyGuesses;
});
```

### Step 3: Optional - Enhance submitResult
Modify `submitResult` to also save individual guesses table:
- You're already doing this! No changes needed.
- Just ensure guesses are sent with each completion.

## Key Decisions to Make

1. **Load on every app start?** 
   - Yes (small data, ensures consistency)

2. **Periodic sync while playing?**
   - Optional but recommended (prevents data loss)
   - Debounce to every 30+ seconds to avoid rate limiting

3. **Show sync status to user?**
   - Optional but helps with trust
   - Badge: "Syncing..." or "✓ Synced"

4. **Handle timezone edge cases?**
   - Yes, use same `pokledleNumber` calculation in both places

## Migration Path

This is **non-breaking**:
- Keep all localStorage logic as-is
- Add server loading on top
- No database schema changes needed
- Works for existing users immediately

## Advantages Over Current Approach

| Aspect | Current | Proposed |
|--------|---------|----------|
| Storage Limit | 5-10MB (mobile) | ~50MB+ (Supabase) |
| Cross-device | ❌ | ✅ |
| Quota errors | 🐛 Silent failures | ✅ No quota limits |
| Offline support | ✅ | ✅ |
| Data recovery | ❌ Lost forever | ✅ In database |
| Complexity | ✅ Simple | Moderate |

## Code Changes Needed

- **New file**: `src/utils/loadGuessesFromServer.ts` (~50 lines)
- **Modified**: `src/App.jsx` (add server load on mount) (~20 lines)
- **No changes**: Database schema, Edge Functions (already support GET)

## Potential Issues & Solutions

| Issue | Solution |
|-------|----------|
| Network unavailable | Use localStorage, no error shown |
| Server slow | Load localStorage immediately, update in background |
| Stale data | Add timestamps, server has authority |
| Rate limiting | Debounce to 30+ second intervals |
| Large data set | Limit guesses to 500 (already in Edge Function) |

## Questions for You

1. Do you want to implement this immediately, or is localStorage + better error handling enough for now?
2. Should users see a sync status, or keep it invisible?
3. Do you need to support loading data from past days, or just today?
