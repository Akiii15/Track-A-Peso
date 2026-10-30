# Pocketbook - Expense and Budget Tracker

Final Project - Web Development  
**System topic:** 10 - Expense and Budget Tracker  
**Live link:** _paste your Render URL here_  
**Section:** _CS3A / CS3B_  **Group #:** _N_

A full-stack web system for recording income and expenses across accounts and categories.
Data is stored in **MongoDB**, served by a **REST API (Express + Mongoose)**, and used by a
**plain HTML / CSS / JavaScript front end** that talks to the API with `fetch`. No front-end framework.

## Group members and roles

| Member | Role | Main parts handled |
|---|---|---|
| _Name 1_ | Project lead / Back end | Express server, routes, error handling |
| _Name 2_ | Database | Mongoose schemas, MongoDB Atlas, seed data |
| _Name 3_ | Front end | HTML structure, CSS, responsive layout |
| _Name 4_ | Front end logic | script.js, fetch calls, filters, dashboard |
| _Name 5_ | Testing / Deployment / Docs | Validation checks, Render deployment, README |

_(Edit this table to match your group. Every member should still understand the whole system.)_

## Features

- **Accounts** - add, edit, delete; each shows its current balance (opening balance + income - expenses)
- **Categories** - add, edit, delete; each is either *income* or *expense*
- **Transactions (main entity)** - add, view, edit, delete income and expense records
- **Filter** by category, account, type, and date range, plus a **search** box
- **Running balance** on every transaction row (stays correct while filtering)
- **Monthly total** - income, expenses and net for the chosen month, plus spending per category
- **Validation and messages** - required fields, amount must be > 0, category must match income/expense,
  duplicate names rejected, accounts/categories in use cannot be deleted; success and error toasts

## Database design (MongoDB, 3 related collections)

```
accounts                 categories               transactions
--------                 ----------               ------------
name (unique)            name (unique)            description
type (cash/bank/...)     type (income/expense)    amount (> 0)
openingBalance                                    type (income/expense)
                                                  date
                                                  account  ---> accounts._id
                                                  category ---> categories._id
                                                  note
```

## API (all responses are JSON)

| Method | Route | Purpose | Success code |
|---|---|---|---|
| GET | `/api/transactions` | List (filters: `search`, `type`, `category`, `account`, `from`, `to`) | 200 |
| GET | `/api/transactions/:id` | One transaction | 200 |
| POST | `/api/transactions` | Add | 201 |
| PUT | `/api/transactions/:id` | Edit | 200 |
| DELETE | `/api/transactions/:id` | Delete | 200 |
| GET / POST | `/api/accounts` | List with balances / add | 200 / 201 |
| GET / PUT / DELETE | `/api/accounts/:id` | One / edit / delete | 200 |
| GET / POST | `/api/categories` | List / add | 200 / 201 |
| GET / PUT / DELETE | `/api/categories/:id` | One / edit / delete | 200 |
| GET | `/api/summary?month=YYYY-MM` | Dashboard numbers | 200 |

Error codes: **400** invalid or missing data, **404** not found, **409** conflict (duplicate name, or deleting
something still in use), **500** server error.

## Run it locally

1. Install [Node.js](https://nodejs.org) (v18 or newer) and have MongoDB running locally, **or** use a free MongoDB Atlas cluster.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and set `MONGODB_URI` (the local default works if MongoDB runs on your PC).
4. (Optional) add sample data for testing and demos:
   ```bash
   npm run seed
   ```
5. Start the server and open <http://localhost:3000>:
   ```bash
   npm start
   ```

## Deploy online (MongoDB Atlas + Render)

1. **Atlas:** create a free cluster -> *Database Access*: add a user with a password -> *Network Access*: allow `0.0.0.0/0`
   -> *Connect > Drivers*: copy the connection string and put your database name before the `?`
   (e.g. `...mongodb.net/pocketbook?retryWrites=true&w=majority`).
2. **GitHub:** push this project (the `.env` file is git-ignored, so your password is not uploaded).
3. **Render:** *New > Web Service* -> connect the repo, then set:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variable: `MONGODB_URI` = your Atlas connection string
4. Open the Render URL, test every feature, and paste the link at the top of this README.
   Free Render services sleep when idle, so open the link a minute before presenting.

## Folder structure

```
server.js              Express app + MongoDB connection
models/                Mongoose schemas (Account, Category, Transaction)
routes/                REST routes (accounts, categories, transactions, summary)
middleware/            ID validation and the JSON error handler
utils/helpers.js       small helpers
seed.js                optional sample data
public/index.html      page structure
public/style.css       styling
public/script.js       fetch calls and DOM updates
```

## Code walkthrough cheat sheet (for the presentation)

- **Schema:** `models/Transaction.js` - `account` and `category` are ObjectId references to the other two collections.
- **API route:** `routes/transactions.js`, the `POST /` handler - validates, checks the account/category exist and
  match income/expense, saves, returns `201`.
- **Fetch call:** `public/script.js`, the `api()` helper and the transaction form's `submit` handler.
- **Extra feature:** filters + running balance (`GET /api/transactions`) and monthly totals (`routes/summary.js`).
