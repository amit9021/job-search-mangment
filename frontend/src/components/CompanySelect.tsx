import { useState, useEffect } from 'react';
import { useCompaniesQuery } from '../api/hooks';

interface CompanySelectProps {
  value?: string; // companyId or company name string
  onChange: (value: { companyId?: string; companyName?: string }) => void;
  placeholder?: string;
}

export const CompanySelect = ({ value, onChange, placeholder = 'Search or create company...' }: CompanySelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState('');

  const { data: companies = [], isLoading } = useCompaniesQuery(searchTerm);

  // Update display value when prop changes
  useEffect(() => {
    if (value) {
      setSelectedDisplay(value);
    }
  }, [value]);

  const handleSelect = (company: { id: string; name: string }) => {
    setSelectedDisplay(company.name);
    onChange({ companyId: company.id });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    if (searchTerm.trim()) {
      setSelectedDisplay(searchTerm);
      onChange({ companyName: searchTerm.trim() });
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setSelectedDisplay(newValue);
    setIsOpen(true);

    // Clear selection when user starts typing
    if (newValue !== value) {
      onChange({ companyName: newValue || undefined });
    }
  };

  const handleBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={selectedDisplay}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {isOpen && (searchTerm.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              {companies.length > 0 ? (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Existing Companies
                  </div>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelect(company)}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <div className="font-medium text-gray-900">{company.name}</div>
                      {company.domain && (
                        <div className="text-xs text-gray-500">{company.domain}</div>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}

              {searchTerm.trim() && (
                <div>
                  {companies.length > 0 && (
                    <div className="border-t border-gray-200"></div>
                  )}
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <div>
                        <div className="font-medium text-green-700">Create "{searchTerm}"</div>
                        <div className="text-xs text-gray-500">Add as new company</div>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {companies.length === 0 && !searchTerm.trim() && (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Start typing to search or create a company
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
