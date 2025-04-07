// src/lib/up-types.ts

// Represents the structure of money values in the API
export interface UpMoneyObject {
    currencyCode: string; // e.g., "AUD"
    value: string; // e.g., "123.45" (string representation)
    valueInBaseUnits: number; // e.g., 12345 (integer in cents)
  }
  
  // Represents the attributes of an Up Account
  export interface UpAccountAttributes {
    displayName: string; // e.g., "Spending", "Rainy Day Saver"
    accountType: 'TRANSACTIONAL' | 'SAVER'; // Type of account
    ownershipType: 'INDIVIDUAL' | 'JOINT'; // Ownership structure
    balance: UpMoneyObject; // Current balance
    createdAt: string; // ISO 8601 timestamp when the account was created
  }
  
  // Represents a single Account resource as returned by the API
  export interface UpAccountResource {
    type: 'accounts'; // Resource type identifier
    id: string; // Unique identifier for the account
    attributes: UpAccountAttributes;
    relationships: {
      transactions: {
        links?: {
          related: string; // URL to fetch transactions for this account
        };
      };
      // Other potential relationships can be added here
    };
    links?: {
      self: string; // URL for this specific account resource
    };
  }
  
  // Represents the top-level structure of the response for a list of accounts
  export interface UpAccountsResponse {
    data: UpAccountResource[]; // An array of account resources
    links: {
      prev: string | null; // Link to the previous page of results (null if none)
      next: string | null; // Link to the next page of results (null if none)
    };
  }
  
  // --- Add other Up API types here as needed (e.g., Transactions) ---
  export interface UpTransactionResource {
    // Define structure later
  }
  
  export interface UpTransactionsResponse {
    // Define structure later
  }