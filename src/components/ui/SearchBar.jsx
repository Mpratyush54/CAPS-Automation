import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  style = {}, 
  containerStyle = {} 
}) => {
  return (
    <div className="search-bar" style={containerStyle}>
      <Search size={14} style={{ color: 'var(--color-outline)' }} />
      <input 
        placeholder={placeholder} 
        value={value} 
        onChange={onChange} 
        style={style}
      />
    </div>
  );
};

export default SearchBar;
