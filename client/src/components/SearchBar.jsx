import React from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';

export const SearchBar = ({ className = '', ...props }) => {
  return (
    <div className={`search ${className}`}>
      <Search className="search-icon" size={20} />
      <Input {...props} />
    </div>
  );
};
