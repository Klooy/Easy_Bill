import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { factusService } from '@/services/factus.service';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

// Module-level cache — shared across all instances, persists until page reload
let cachedMunicipalities = null;
let cachePromise = null;
let loadFailed = false;

const loadAllMunicipalities = async () => {
  if (cachedMunicipalities) return cachedMunicipalities;
  if (loadFailed) return [];
  if (cachePromise) return cachePromise;

  cachePromise = factusService.searchMunicipalities('', true)
    .then((res) => {
      const data = res.data || [];
      if (data.length === 0) {
        // Likely an error — don't cache empty
        cachePromise = null;
        loadFailed = true;
        return [];
      }
      cachedMunicipalities = data;
      return cachedMunicipalities;
    })
    .catch((err) => {
      console.error('[MunicipalitySearch] Failed to load municipalities:', err);
      cachePromise = null;
      loadFailed = true;
      return [];
    });

  return cachePromise;
};

/**
 * Fallback: search via edge function per-query (old behavior)
 */
const searchRemote = async (query) => {
  try {
    const res = await factusService.searchMunicipalities(query, false);
    return res.data || [];
  } catch {
    return [];
  }
};

/**
 * Normalize text for accent-insensitive search
 * "Bogotá" → "bogota", "Medellín" → "medellin"
 */
const normalize = (str) =>
  str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

const MunicipalitySearch = ({ value, onChange, error }) => {
  const [query, setQuery] = useState('');
  const [allMunicipalities, setAllMunicipalities] = useState([]);
  const [remoteResults, setRemoteResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [useRemote, setUseRemote] = useState(false);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load all municipalities on first mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAllMunicipalities().then((data) => {
      if (!cancelled) {
        if (data.length === 0) {
          setUseRemote(true);
        }
        setAllMunicipalities(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Remote fallback: search when local data is empty
  useEffect(() => {
    if (!useRemote || !debouncedQuery || debouncedQuery.length < 2) {
      setRemoteResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchRemote(debouncedQuery).then((data) => {
      if (!cancelled) {
        setRemoteResults(data);
        setSearching(false);
      }
    });
    return () => { cancelled = true; };
  }, [debouncedQuery, useRemote]);

  // Filter locally — instant, accent-insensitive, matches name OR department
  const localFiltered = useMemo(() => {
    if (useRemote || !query || query.length < 1) return [];
    const normalizedQuery = normalize(query);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return allMunicipalities
      .filter((m) => {
        const normalizedName = normalize(m.name);
        const normalizedDept = normalize(m.department);
        const combined = `${normalizedName} ${normalizedDept}`;
        return terms.every((term) => combined.includes(term));
      })
      .slice(0, 30);
  }, [query, allMunicipalities, useRemote]);

  // Use local filtered or remote results based on mode
  const filtered = useRemote ? remoteResults : localFiltered;
  const isSearching = useRemote ? searching : false;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If value prop changes externally (form reset, edit)
  useEffect(() => {
    if (value && !selected) {
      const found = allMunicipalities.find((m) => m.id === Number(value));
      if (found) {
        setSelected(found);
      } else {
        setSelected({ id: value, name: `ID: ${value}`, department: '' });
      }
    }
    if (!value && selected) {
      setSelected(null);
      setQuery('');
    }
  }, [value, allMunicipalities]);

  // Reset highlight when filtered results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-municipality-item]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = (municipality) => {
    setSelected(municipality);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
    onChange(municipality.id);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    onChange('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Highlight matching text
  const highlightMatch = (text) => {
    if (!query) return text;
    const normalizedText = normalize(text);
    const normalizedQuery = normalize(query);
    const idx = normalizedText.indexOf(normalizedQuery);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-sm px-0.5">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  if (selected) {
    return (
      <div className={cn(
        'flex min-h-[40px] items-center gap-2 rounded-input border bg-primary-50 dark:bg-primary-900/20 px-3 py-2',
        error ? 'border-red-300' : 'border-primary-200'
      )}>
        <MapPin className="h-4 w-4 flex-shrink-0 text-primary-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selected.name}</p>
          {selected.department && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{selected.department}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex-shrink-0 rounded p-0.5 text-gray-400 dark:text-gray-500 hover:bg-gray-200 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <Input
          ref={inputRef}
          className={cn('rounded-input pl-9', error && 'border-red-300')}
          placeholder={loading && !useRemote ? 'Cargando municipios...' : 'Buscar municipio...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length >= 1 && filtered.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={loading && !useRemote && allMunicipalities.length === 0}
        />
        {((loading && !useRemote && allMunicipalities.length === 0) || isSearching) && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-input border bg-white dark:bg-gray-800 shadow-lg"
        >
          {filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              data-municipality-item
              onClick={() => handleSelect(m)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                i === highlightIndex
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary-400" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {highlightMatch(m.name)}
                </span>
                <span className="ml-1 text-gray-400 dark:text-gray-500">—</span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  {highlightMatch(m.department)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 1 && !isSearching && !(loading && !useRemote) && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-input border bg-white dark:bg-gray-800 p-3 text-center text-sm text-gray-500 dark:text-gray-400 shadow-lg">
          {useRemote && query.length < 2
            ? 'Escribe al menos 2 caracteres para buscar'
            : 'No se encontraron municipios'}
        </div>
      )}
    </div>
  );
};

export { MunicipalitySearch };
