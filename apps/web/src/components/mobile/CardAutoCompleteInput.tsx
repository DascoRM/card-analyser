'use client';

import { useState, useEffect, useRef } from 'react';
import { searchCards } from '@/lib/api';
import { CardSearchResult } from '@/lib/types';
import { LoadingSpinner } from '@/components/shared';

interface CardAutoCompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (card: CardSearchResult) => void;
}

export function CardAutoCompleteInput({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
}: CardAutoCompleteInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchCards(searchTerm, 8);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  const handleSelect = (card: CardSearchResult) => {
    onChange(card.name);
    setSearchTerm(card.name);
    onSelect(card);
    setShowDropdown(false);
  };

  return (
    <div className="relative mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* Dropdown results */}
      {showDropdown && (searchTerm.length >= 2 || results.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Recherche...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card)}
                className="w-full p-3 hover:bg-gray-100 flex items-center gap-3 text-left border-b border-gray-100 last:border-b-0"
              >
                {card.imageUrl && (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-10 h-14 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {card.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {card.set}
                    {card.number && ` • #${card.number}`}
                  </p>
                </div>
              </button>
            ))
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              Aucun resultat trouve
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
