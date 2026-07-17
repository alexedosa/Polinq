Authentication services live in `authApi.js`.

Token persistence is handled by `tokenStorage.js`, and short-lived auth flow
context such as pending OTP purpose is handled by `authSession.js`.
