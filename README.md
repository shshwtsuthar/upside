# Upside - A frontend for the Up banking API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Upside is an open-source, web application designed to provide an enhanced frontend experience for interacting with your [Up Banking](https://up.com.au/) data. It offers visualizations and features beyond the standard Up app, built with Next.js, ShadCN UI, Prisma, and PostgreSQL.

**(Optional: Add a screenshot here when ready)**
![Upside Screenshot]()

## Features

*   **Secure Authentication:** Sign in securely using your Google account via NextAuth.js.
*   **Encrypted Token Storage:** Your Up Banking Personal Access Token is stored securely using AES-256-GCM encryption on the server.
*   **Dashboard Overview:**
    *   Displays Total Balance across all accounts.
    *   Shows Monthly Income and Spending summaries.
    *   Lists your Up accounts (Transactional & Saver).
    *   Visualizes Spending by Category for the current month with a Pie Chart.
*   **Transactions Page:**
    *   Dedicated page to browse transaction history.
    *   **Infinite Scrolling:** Automatically loads more transactions as you scroll.
    *   **Date Range Filtering:** Filter transactions using a calendar date range picker.
*   **Analytics Page (Initial):**
    *   **Spending by Category:** Pie chart showing spending distribution for the current month.
    *   **Income vs. Spending:** Bar chart comparing total income and spending for the current month (in progress).
*   **Settings:**
    *   Manage your Up Banking Personal Access Token (Add / Remove).
*   **Theming:** Supports Light and Dark modes, syncing with your system preferences.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **UI:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [ShadCN UI](https://ui.shadcn.com/), [Recharts](https://recharts.org/) (via ShadCN Charts)
*   **Authentication:** [NextAuth.js](https://next-auth.js.org/)
*   **Database:** [PostgreSQL](https://www.postgresql.org/)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **API:** [Up Banking API](https://developer.up.com.au/)
*   **Deployment:** [Vercel](https://vercel.com/)

## Development Setup

Follow these steps to set up the project for local development:

**Prerequisites:**

*   [Node.js](https://nodejs.org/) (Recommended version >= 18)
*   [npm](https://www.npmjs.com/) (or [yarn](https://yarnpkg.com/))
*   [Git](https://git-scm.com/)
*   A [PostgreSQL](https://www.postgresql.org/download/) database instance (local or cloud-based like [Supabase](https://supabase.com/), ElephantSQL, Railway, etc.)

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/shshwtsuthar/upside
    cd upside
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up the Database:**
    *   Ensure your PostgreSQL server is running.
    *   Create a database for this project (e.g., `upside_dev`).

4.  **Configure Environment Variables:**
    *   Create a `.env.local` file in the root of the project.
    *   Copy the contents of `.env.example` or add the following variables:

    ```env
    # 1. Database Connection (Replace with your actual credentials)
    # Example for local PostgreSQL:
    DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/upside_dev?schema=public"
    # Example for Supabase: Find URL in Supabase Dashboard > Project Settings > Database > Connection string > URI

    # 2. NextAuth Configuration
    # Generate a strong secret: openssl rand -base64 32
    NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET"
    # URL of your app (important for local dev callbacks)
    NEXTAUTH_URL="http://localhost:3000"

    # 3. Google OAuth Credentials (From Google Cloud Console)
    # https://console.cloud.google.com/apis/credentials
    GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
    GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

    # 4. Up Token Encryption Key (MUST be 64 hex characters / 32 bytes)
    # Generate using Node: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    UP_TOKEN_ENCRYPTION_KEY="YOUR_64_CHARACTER_HEX_ENCRYPTION_KEY"

    ```

5.  **Apply Database Migrations:**
    ```bash
    npx prisma migrate dev
    ```
    This command sets up the database schema based on `prisma/schema.prisma`.

6.  **Generate Prisma Client:** (Usually run by `migrate dev`, but good to know)
    ```bash
    npx prisma generate
    ```

7.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

8.  **Access the Application:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The following environment variables are required for the application to run correctly. Store them in a `.env.local` or `.env` file for local development.

*   `DATABASE_URL`: Connection string for your PostgreSQL database.
*   `NEXTAUTH_SECRET`: A secret key used by NextAuth.js for session encryption. Generate using `openssl rand -base64 32`.
*   `NEXTAUTH_URL`: The base URL of your application (e.g., `http://localhost:3000` for local development).
*   `GOOGLE_CLIENT_ID`: Your Google OAuth application client ID.
*   `GOOGLE_CLIENT_SECRET`: Your Google OAuth application client secret.
*   `UP_TOKEN_ENCRYPTION_KEY`: A **64-character hexadecimal string (32 bytes)** used to encrypt Up API tokens in the database. Generate securely (e.g., `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). **Keep this secret!**

## Deployment

The easiest way to deploy this Next.js application is using [Vercel](https://vercel.com/).

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project into Vercel.
3.  Configure the required **Environment Variables** listed above in the Vercel project settings.
4.  Vercel will automatically build and deploy your application. Ensure your `DATABASE_URL` points to a production-accessible database.

For more details, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## TODO / Future Enhancements

*   **Transactions Page:**
    *   Implement Account Selector filter.
    *   Implement Category Selector filter (requires fetching Up categories).
    *   Implement Transaction Type filter (Income/Spending - may require amount filtering on Up API or client-side filtering).
    *   Implement Search functionality (with debouncing).
    *   Add "View Details" modal/sheet for individual transactions.
*   **Analytics Page:**
    *   Implement Date Range selector with presets (Last Month, YTD, etc.).
    *   Fetch and process data for multiple months for trend charts.
    *   Implement "Top Spending Categories" list/chart.
    *   (Optional) Implement Account filtering for reports.
*   **Settings Page:**
    *   Add "Export Data" (CSV) functionality.
    *   Display "Token Last Updated" timestamp.
*   **New Pages:**
    *   Consider a Budgeting page (requires DB changes).
    *   Consider a Savings Goals page (requires checking Up API capabilities).
*   **General:**
    *   Refine UI/UX and responsiveness.
    *   Improve loading state granularity.
    *   Enhance error handling and user feedback.
    *   Add unit/integration tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (you would create a `LICENSE` file with the MIT license text).