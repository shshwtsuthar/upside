// lib/up-api-types.ts

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

// -- Tran Types --

export enum UpTransactionStatusEnum {
  HELD = 'HELD',
  SETTLED = 'SETTLED',
}

export interface UpTransactionAttributes {
  status: UpTransactionStatusEnum; // Status of the transaction
  rawText: string | null; // Raw text description from the bank (often null)
  description: string; // Clean description
  message: string | null; // Optional message attached to the transaction
  isCategorizable: boolean; // If the transaction can be categorized
  holdInfo: {
      amount: UpMoneyObject;
      foreignAmount: UpMoneyObject | null;
  } | null; // Details if transaction status is HELD
  roundUp: {
      amount: UpMoneyObject;
      boostPortion: UpMoneyObject | null;
  } | null; // Details if Round Up was applied
  cashback: {
      description: string;
      amount: UpMoneyObject;
  } | null; // Details if cashback was applied
  amount: UpMoneyObject; // The transaction amount
  foreignAmount: UpMoneyObject | null; // Amount in foreign currency (if applicable)
  cardPurchaseMethod?: 'CONTACTLESS' | 'CARD_INSERT' | 'MANUAL_ENTRY' | 'MAGSTRIPE' | 'ECOMMERCE' | string; // Optional: How card was used (added string for flexibility)
  settledAt: string | null; // ISO 8601 timestamp when the transaction settled
  createdAt: string; // ISO 8601 timestamp when the transaction was created
}

export interface UpTransactionRelationships {
  account: {
      data: {
          type: 'accounts';
          id: string;
      };
      links?: {
          related: string;
      };
  };
  transferAccount: {
      data: {
          type: 'accounts';
          id: string;
      } | null; // Null if not a transfer
      links?: {
          related: string;
      };
  } | null; // Optional: transferAccount relationship
  category: {
      data: {
          type: 'categories';
          id: string;
      } | null; // Can be null if uncategorized
      links?: {
          related: string;
          self: string;
      };
  };
  parentCategory: {
      data: {
          type: 'categories';
          id: string;
      } | null; // Can be null
      links?: {
          related: string;
      };
  };
  tags: {
      data: {
          type: 'tags';
          id: string;
      }[]; // An array of tags
      links?: {
          self: string;
      };
  };
}

export interface UpTransactionResource {
  type: 'transactions';
  id: string;
  attributes: UpTransactionAttributes;
  relationships: UpTransactionRelationships;
  links?: {
      self: string;
  };
}

export interface UpTransactionsResponse {
  data: UpTransactionResource[];
  links: {
      prev: string | null;
      next: string | null;
  };
}

// --- Utility Types ---
export interface UpErrorObject {
  status: string; // HTTP status code (as string)
  title: string; // Short summary of the problem
  detail: string; // Human-readable explanation
  source?: { // Optional: More specific info
    parameter?: string; // Query parameter related to error
    pointer?: string; // JSON Pointer [RFC6901] to the offending part of request document
  };
}

export interface UpErrorResponse {
  errors: UpErrorObject[];
}

export interface UpCategoryAttributes {
  name: string; // e.g., "Groceries", "Transport"
}

// Represents a single Category resource
export interface UpCategoryResource {
  type: 'categories';
  id: string; // Unique identifier for the category (e.g., "groceries")
  attributes: UpCategoryAttributes;
  relationships: {
    parent: { // Relationship to parent category
      data: {
        type: 'categories';
        id: string;
      } | null; // Null for top-level categories
      links?: {
        related: string;
      };
    };
    children: { // Relationship to child categories
      data: {
        type: 'categories';
        id: string;
      }[]; // Array of child category identifiers
      links?: {
        related: string;
      };
    };
  };
  links?: {
      self: string;
  };
}

// Represents the top-level structure for a list of categories
export interface UpCategoriesResponse {
  data: UpCategoryResource[];
  links: {
    prev: string | null;
    next: string | null;
  };
}