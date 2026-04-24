/**
 * @file     useIfscLookup.ts
 * @purpose  IFSC → bank name + branch lookup. Mocked for S4; ready for real API.
 * @sprint   T-H1.5-C-S4
 */
import { useState, useCallback } from 'react';

export interface IfscLookupResult {
  bankName: string;
  branchName: string;
  city: string;
  state: string;
}

const MOCK_IFSC_DB: Record<string, IfscLookupResult> = {
  SBIN0000001: { bankName: 'State Bank of India', branchName: 'Mumbai Main', city: 'Mumbai', state: 'Maharashtra' },
  HDFC0000001: { bankName: 'HDFC Bank', branchName: 'Mumbai Fort', city: 'Mumbai', state: 'Maharashtra' },
  ICIC0000001: { bankName: 'ICICI Bank', branchName: 'Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra' },
  AXIS0000001: { bankName: 'Axis Bank', branchName: 'Worli', city: 'Mumbai', state: 'Maharashtra' },
  KKBK0000001: { bankName: 'Kotak Mahindra Bank', branchName: 'Nariman Point', city: 'Mumbai', state: 'Maharashtra' },
};

const BANK_PREFIX_MAP: Record<string, string> = {
  SBIN: 'State Bank of India',
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  AXIS: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  CNRB: 'Canara Bank',
  UBIN: 'Union Bank of India',
  IDFB: 'IDFC First Bank',
  YESB: 'Yes Bank',
};

export function useIfscLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (ifsc: string): Promise<IfscLookupResult | null> => {
    setLoading(true);
    setError(null);
    try {
      // [JWT] GET /api/banking/ifsc/:ifsc — real endpoint later
      await new Promise(r => setTimeout(r, 300));
      const normalized = ifsc.trim().toUpperCase();
      if (normalized.length !== 11) {
        setError('IFSC must be 11 characters');
        return null;
      }
      const exact = MOCK_IFSC_DB[normalized];
      if (exact) return exact;
      const bankCode = normalized.slice(0, 4);
      const bankName = BANK_PREFIX_MAP[bankCode];
      if (bankName) {
        return { bankName, branchName: 'Branch ' + normalized.slice(5), city: '', state: '' };
      }
      setError('Bank not found. Please enter manually.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error };
}
