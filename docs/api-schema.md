# Binary WebSocket API Schema

## Endpoint Index

| # | Endpoint | Category | Authentication | Description | Reference |
|---|----------|----------|----------------|-------------|-----------|
| 1 | `authorize` | Account | Not Required | Authorize WebSocket connection with token | [Details](#1-authorize) |
| 2 | `balance` | Account | Required (trade) | Get account balance with optional streaming | [Details](#2-balance) |
| 3 | `get_session_token` | Account | Not Required | Exchange one-time token for session token | [Details](#3-get_session_token) |
| 4 | `portfolio` | Account | Required (trade) | Get current portfolio of outstanding options | [Details](#4-portfolio) |
| 5 | `profit_table` | Account | Required (trade) | Retrieve account profit table with search criteria | [Details](#5-profit_table) |
| 6 | `statement` | Account | Required (trade) | Retrieve account transactions with search criteria | [Details](#6-statement) |
| 7 | `active_symbols` | Data | Not Required | Get list of all currently active trading symbols | [Details](#7-active_symbols) |
| 8 | `contracts_for` | Data | Not Required | Get available contracts for a specific symbol | [Details](#8-contracts_for) |
| 9 | `ticks` | Data | Not Required | Stream real-time spot price updates for symbols | [Details](#9-ticks) |
| 10 | `ticks_history` | Data | Not Required | Get historic tick data for a symbol | [Details](#10-ticks_history) |
| 11 | `proposal` | Trading | Not Required | Get latest price for a specific contract | [Details](#11-proposal) |
| 12 | `buy` | Trading | Required (trade) | Purchase a contract | [Details](#12-buy) |
| 13 | `sell` | Trading | Required (trade) | Sell a contract by contract ID | [Details](#13-sell) |
| 14 | `proposal_open_contract` | Trading | Required (trade) | Get latest price for open contracts in portfolio | [Details](#14-proposal_open_contract) |
| 15 | `cancel` | Trading | Required (trade) | Cancel a contract by contract ID | [Details](#15-cancel) |
| 16 | `forget` | Trading | Not Required | Cancel real-time stream by subscription ID | [Details](#16-forget) |
| 17 | `forget_all` | Trading | Not Required | Cancel all real-time streams | [Details](#17-forget_all) |
| 18 | `contract_update` | Trading | Required (trade) | Update contract parameters | [Details](#18-contract_update) |
| 19 | `contract_update_history` | Trading | Required (trade) | Get contract update history | [Details](#19-contract_update_history) |
| 20 | `transaction` | Trading | Required (trade) | Subscribe to transaction notifications | [Details](#20-transaction) |

## Overview

The Binary WebSocket API provides real-time access to trading functionality, market data, and account management for Binary.com services. This API enables developers to build trading applications, retrieve market information, and manage user accounts through a WebSocket connection.

**WebSocket Endpoint:** `wss://ws.binaryws.com/websockets/v3`

## Connection Details

### Authentication Requirements

Some API calls require authentication. The authentication process involves two steps:

1. **Get Session Token**: Exchange a short-lived one-time token from the brand for a session token using the `get_session_token` endpoint
2. **Authorize Connection**: Use the session token with the `authorize` endpoint to authenticate your WebSocket connection

### Request/Response Format

- **Request Format**: All requests must be sent as JSON objects with the appropriate action name as a key
- **Response Format**: All responses are JSON objects containing:
  - `echo_req`: Echo of the request made
  - `msg_type`: Action name of the request made  
  - `req_id`: (Optional) Present only when request contains `req_id`

### Common Parameters

These parameters can be used with any request:
- `passthrough`: Used to pass data through the websocket, retrievable via `echo_req`
- `req_id`: Used to map request to response

## API Endpoints by Category

### Account APIs

#### 1. authorize
**Description**: Authorize current WebSocket connection to act on behalf of the owner of a given token.

**Authentication**: Not Required

**Method**: `authorize`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| authorize | string | Yes | Authentication token from brands Manager API |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| authorize | object | Account information for token holder |
| authorize.balance | number | Cash balance of the account |
| authorize.currency | string | Currency of the account |
| authorize.is_virtual | integer | 1 or 0, indicating virtual-money account |
| authorize.loginid | string | Account ID that token was issued for |

**Example Request**:
```json
{
   "authorize" : "<token>",
   "req_id" : 9
}
```

**Example Response**:
```json
{
   "authorize" : {
      "balance" : 10092.59,
      "currency" : "USD",
      "is_virtual" : 1,
      "loginid" : "VRTC965733",
      "scopes" : ["trade"]
   },
   "msg_type" : "authorize",
   "req_id" : 9
}
```

#### 2. balance
**Description**: Get the account's balance

**Authentication**: Required (Scopes: trade)

**Method**: `balance`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| balance | integer | Yes | Must be `1` |
| subscribe | integer | No | If set to 1, sends updates when balance changes |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| balance | object | Current balance of one or more accounts |
| balance.balance | number | Balance of current account |
| balance.currency | string | Currency of current account |
| balance.loginid | string | Client loginid |

**Example Request**:
```json
{
   "balance" : 1,
   "req_id" : 4,
   "subscribe" : 1
}
```

#### 3. get_session_token
**Description**: Exchange short-living one-time token for a session token

**Authentication**: Not Required

**Method**: `get_session_token`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| get_session_token | string | Yes | The one-time token from the brand |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| get_session_token | object | Information about issued session token |
| get_session_token.token | string | The session token |
| get_session_token.expires | string | Timestamp when session token expires |

#### 4. portfolio
**Description**: Receive information about current portfolio of outstanding options

**Authentication**: Required (Scopes: trade)

**Method**: `portfolio`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| portfolio | integer | Yes | Must be `1` |
| contract_type | array | No | Return only contracts of specified types |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| portfolio | object | Current account's open positions |
| portfolio.contracts | array | List of open positions |
| portfolio.contracts[].buy_price | number | Buy price |
| portfolio.contracts[].contract_id | integer | Internal contract identifier |
| portfolio.contracts[].contract_type | string | Contract type |
| portfolio.contracts[].currency | string | Contract currency |

#### 5. profit_table
**Description**: Retrieve a summary of account Profit Table according to search criteria

**Authentication**: Required (Scopes: trade)

**Method**: `profit_table`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| profit_table | integer | Yes | Must be `1` |
| contract_type | array | No | Return only contracts of specified types |
| date_from | string | No | Start date (epoch or YYYY-MM-DD) |
| date_to | string | No | End date (epoch or YYYY-MM-DD) |
| description | integer | No | If set to 1, returns full contracts description |
| limit | number | No | Upper limit to count of transactions |
| offset | integer | No | Number of transactions to skip |

#### 6. statement
**Description**: Retrieve a summary of account transactions according to search criteria

**Authentication**: Required (Scopes: trade)

**Method**: `statement`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| statement | integer | Yes | Must be `1` |
| action_type | string | No | Filter by transaction type |
| date_from | integer | No | Start date (epoch) |
| date_to | integer | No | End date (epoch) |
| description | integer | No | If set to 1, returns full contracts description |
| limit | number | No | Maximum number of transactions |
| offset | integer | No | Number of transactions to skip |

### Data APIs

#### 7. active_symbols
**Description**: Retrieve a list of all currently active symbols

**Authentication**: Not Required

**Method**: `active_symbols`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| active_symbols | string | Yes | Use `brief` for subset of fields |
| contract_type | array | No | The proposed contract type |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| active_symbols | array | List of active symbols |
| active_symbols[].display_order | integer | Display order |
| active_symbols[].exchange_is_open | integer | 1 if market open, 0 if closed |
| active_symbols[].is_trading_suspended | integer | 1 if trading suspended, 0 if not |
| active_symbols[].market | string | Market category (forex, indices, etc) |
| active_symbols[].pip_size | number | Pip size (minimum fluctuation amount) |
| active_symbols[].underlying_symbol | string | Symbol code for this underlying |

#### 8. contracts_for
**Description**: Get list of currently available contracts for a given symbol

**Authentication**: Not Required

**Method**: `contracts_for`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contracts_for | string | Yes | Short symbol name from `active_symbols` call |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| contracts_for | object | List of available contracts |
| contracts_for.available | array | Array of available contracts details |
| contracts_for.hit_count | number | Count of contracts available |

#### 9. ticks
**Description**: Initiate a continuous stream of spot price updates for a given symbol

**Authentication**: Not Required

**Method**: `ticks`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticks | string/array | Yes | Short symbol name or array of symbols |
| subscribe | integer | No | If set to 1, sends updates on new ticks |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| tick | object | Tick by tick list of streamed data |
| tick.ask | number | Market ask at the epoch |
| tick.bid | number | Market bid at the epoch |
| tick.epoch | integer | Epoch time of the tick |
| tick.quote | number | Market value at the epoch |
| tick.symbol | string | Symbol |

#### 10. ticks_history
**Description**: Get historic tick data for a given symbol

**Authentication**: Not Required

**Method**: `ticks_history`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticks_history | string | Yes | Short symbol name from `active_symbols` call |
| end | string | Yes | Latest boundary of returned ticks |
| start | integer | No | Earliest boundary of returned ticks |
| count | integer | No | Upper limit on ticks to receive |
| style | string | No | Tick-output style |
| granularity | integer | No | Candle time-dimension width setting |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| history | object | Historic tick data for given symbol |
| history.prices | array | List of tick values |
| history.times | array | List of epoch values |

### Trading APIs

#### 11. proposal
**Description**: Gets latest price for a specific contract

**Authentication**: Not Required

**Method**: `proposal`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| proposal | integer | Yes | Must be `1` |
| contract_type | string | Yes | The proposed contract type |
| currency | string | Yes | Account-holder's currency |
| underlying_symbol | string | Yes | Symbol code from `active_symbols` call |
| amount | number | No | Proposed contract payout or stake |
| barrier | string | No | Barrier for the contract |
| basis | string | No | Indicates type of the `amount` |
| duration | integer | No | Duration quantity |
| duration_unit | string | No | Duration unit (s, m, h, d, t) |
| subscribe | integer | No | 1 to initiate realtime stream of prices |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| proposal | object | Latest price and other details |
| proposal.ask_price | number | The ask price |
| proposal.payout | number | The payout amount of the contract |
| proposal.spot | number | Spot value |
| proposal.longcode | string | Contract description |

#### 12. buy
**Description**: Buy a Contract

**Authentication**: Required (Scopes: trade)

**Method**: `buy`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| buy | string | Yes | ID from Price Proposal or `1` with parameters |
| price | number | Yes | Maximum price to purchase contract |
| parameters | object | No | Contract buy parameters |
| subscribe | integer | No | `1` to stream |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| buy | object | Receipt confirmation for the purchase |
| buy.balance_after | number | New account balance after purchase |
| buy.buy_price | number | Actual effected purchase price |
| buy.contract_id | integer | Internal contract identifier |
| buy.longcode | string | Description of contract purchased |
| buy.transaction_id | integer | Internal transaction identifier |

#### 13. sell
**Description**: Sell a Contract as identified by the contract_id

**Authentication**: Required (Scopes: trade)

**Method**: `sell`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sell | integer | Yes | Contract_id from `portfolio` call |
| price | number | Yes | Minimum price to sell contract, or `0` for market |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| sell | object | Receipt for the transaction |
| sell.balance_after | number | New account balance after sale |
| sell.contract_id | integer | Internal contract identifier |
| sell.sold_for | number | Actual effected sale price |
| sell.transaction_id | integer | Internal transaction identifier |

#### 14. proposal_open_contract
**Description**: Get latest price and information for contracts in account's portfolio

**Authentication**: Required (Scopes: trade)

**Method**: `proposal_open_contract`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| proposal_open_contract | integer | Yes | Must be `1` |
| contract_id | integer | No | Contract ID from `portfolio` request |
| subscribe | integer | No | `1` to stream |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| proposal_open_contract | object | Latest price and details for open contract |
| proposal_open_contract.bid_price | string | Price contract could be sold back |
| proposal_open_contract.buy_price | string | Price contract was purchased |
| proposal_open_contract.contract_id | integer | Internal contract identifier |
| proposal_open_contract.profit | string | Latest bid price minus buy price |

#### 15. cancel
**Description**: Cancel contract with contract id

**Authentication**: Required (Scopes: trade)

**Method**: `cancel`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| cancel | integer | Yes | Contract_id from `portfolio` call |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| cancel | object | Receipt for the transaction |
| cancel.balance_after | number | New account balance after cancellation |
| cancel.contract_id | integer | Internal contract identifier |
| cancel.sold_for | number | Actual effected sale price |

#### 16. forget
**Description**: Immediately cancel the real-time stream of messages with a specific ID

**Authentication**: Not Required

**Method**: `forget`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forget | string | Yes | ID of real-time stream to cancel |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| forget | integer | 1 if stream exited, 0 if stream did not exist |

#### 17. forget_all
**Description**: Cancel all real-time streams

**Authentication**: Not Required

**Method**: `forget_all`

#### 18. contract_update
**Description**: Update a contract

**Authentication**: Required (Scopes: trade)

**Method**: `contract_update`

#### 19. contract_update_history
**Description**: Request for contract update history

**Authentication**: Required (Scopes: trade)

**Method**: `contract_update_history`

#### 20. transaction
**Description**: Subscribe to transaction notifications

**Authentication**: Required (Scopes: trade)

**Method**: `transaction`

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| transaction | integer | Yes | Must be `1` |
| subscribe | integer | Yes | If set to 1, sends updates on transactions |
| passthrough | object | No | Pass data through websocket |
| req_id | integer | No | Map request to response |

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| transaction | object | Realtime stream of user transaction updates |
| transaction.action | string | The transaction type |
| transaction.amount | number | Amount of transaction performed |
| transaction.balance | number | Balance amount |
| transaction.contract_id | integer | Contract ID |

## Summary

- **Total Endpoints**: 20
- **Account APIs**: 6 endpoints
- **Data APIs**: 4 endpoints  
- **Trading APIs**: 10 endpoints

### Breakdown by Category:

**Account APIs (6)**:
- authorize, balance, get_session_token, portfolio, profit_table, statement

**Data APIs (4)**:
- active_symbols, contracts_for, ticks, ticks_history

**Trading APIs (10)**:
- proposal, buy, sell, proposal_open_contract, cancel, forget, forget_all, contract_update, contract_update_history, transaction

## Additional Sections

### Error Handling
All API responses include standard error handling. Failed requests will return error information in the response object.

### Rate Limits
Rate limits may apply to certain endpoints. Check the API documentation for specific limits.

### Streaming Subscriptions
Many endpoints support real-time streaming by setting `subscribe: 1` in the request. Use the `forget` endpoint to cancel subscriptions using the subscription ID returned in responses.

### Important Notes
- Authentication tokens have expiration times
- Some endpoints require specific scopes (e.g., "trade" scope)
- WebSocket connection must remain active for streaming subscriptions
- Use `req_id` parameter to match requests with responses in high-frequency scenarios
- All monetary amounts are returned as numbers or strings depending on the endpoint
- Epoch timestamps are used throughout the API for time values
