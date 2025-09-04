Add the `MONGO_URI` environment variable to your Vercel project settings.

1. Go to your project on Vercel.
2. Settings -> Environment Variables.
3. Add a new variable:
   - Key: `MONGO_URI`
   - Value: `mongodb+srv://rakesh_db:hellouser1234A@cluster0.6yqatas.mongodb.net/mydatabase?retryWrites=true&w=majority&tls=true`
   - Environment: Production (and Preview/Development as needed)

Testing after deploy:

- Deploy the project on Vercel.
- Send a POST request to `https://<your-deployment>.vercel.app/api/users` with JSON body `{ "name": "Test User", "email": "test@example.com" }`.
- You can use `curl`:

```bash
curl -X POST https://<your-deployment>.vercel.app/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'
```

- Expected responses:
  - 201: Created with the new user object
  - 400: Missing name/email
  - 409: Email already exists
  - 500: Server or DB error


