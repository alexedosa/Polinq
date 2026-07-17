Shared API client lives in `client.js`.

It uses the backend response envelope, attaches bearer tokens for authenticated
requests, refreshes expired access tokens once, and centralizes API errors.
