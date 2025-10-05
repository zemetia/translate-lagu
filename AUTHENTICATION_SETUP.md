# Authentication Setup Guide

## ⚠️ Implementation Status

The authentication system has been partially implemented. The following tasks are **COMPLETE**:

✅ Firebase configuration (`src/lib/firebase.ts`)
✅ Authentication context provider (`src/lib/auth-context.tsx`)
✅ Login form component (`src/components/auth/login-form.tsx`)
✅ Register form component (`src/components/auth/register-form.tsx`)
✅ Auth gate component (`src/components/auth/auth-gate.tsx`)
✅ Modified server actions to accept user IDs (`src/app/actions.ts`)
✅ Modified Genkit to support user API keys (`src/ai/genkit.ts`)
✅ Environment variables template (`.env.example`)

## 🚧 Remaining Tasks

### 1. Update AI Flows (CRITICAL)
The following AI flow files need to be updated to accept and use user API keys:

- `src/ai/flows/refine-translation.ts` - Add `apiKey?:string` parameter
- `src/ai/flows/search-songs.ts` - Update `getLyricsForSong` and `extractSongFromUrl` to accept `apiKey`

**Pattern to follow** (see `translate-lyrics.ts` lines 17-96):
```typescript
export async function flowName(input: InputType, apiKey?: string): Promise<OutputType> {
  const aiInstance = apiKey ? createAIInstance(apiKey) : ai;
  // Use aiInstance instead of ai for definePrompt
}
```

### 2. Update Layout (`src/app/layout.tsx`)
Wrap the app with AuthProvider:
```typescript
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 3. Update Main Page (`src/app/page.tsx`)
Wrap TranslationClient with AuthGate and add logout:
```typescript
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

// Inside the component, add logout button to header
<header>
  {/* existing header content */}
  {user && (
    <Button onClick={signOut} variant="outline">
      <LogOut /> Sign Out
    </Button>
  )}
</header>

<main>
  <AuthGate>
    <TranslationClient />
  </AuthGate>
</main>
```

### 4. Update Translation Client (`src/components/translation-client.tsx`)
Pass user ID to all server actions:
```typescript
import { useAuth } from "@/lib/auth-context";

export function TranslationClient() {
  const { user } = useAuth();

  // In all server action calls, add uid:
  await handleSearch(formData); // Add: formData.append("uid", user!.uid);
  await handleGetLyrics({ ...data, uid: user!.uid });
  await handleTranslation({ lyrics, uid: user!.uid });
  await handleRefinement({ ...data, uid: user!.uid });
  await handleUrlExtraction(formData); // Add: formData.append("uid", user!.uid);
}
```

### 5. Install Firebase Admin SDK
```bash
npm install firebase-admin
```

### 6. Setup Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable Authentication → Email/Password
4. Create Firestore Database
5. Add Firebase Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
6. Get your config from Project Settings → General → Your apps
7. Add values to `.env` file

## 🔧 Configuration

Copy `.env.example` to `.env` and fill in your Firebase credentials:
```bash
cp .env.example .env
```

## 📝 User Flow

1. User visits site → sees login/register form
2. New user registers with:
   - Full Name
   - Email
   - Password
   - **Google Gemini API Key** (required)
3. Data stored in Firebase Auth + Firestore
4. User logs in → accesses translation features
5. All AI operations use their personal Gemini API key
6. User can logout from header

## 🔐 Security Notes

- User API keys are stored in Firestore (consider encryption for production)
- Firebase Security Rules prevent users from accessing other users' data
- Server-side validation of all inputs
- Each user's API key is fetched server-side for each request

## 🎯 Testing

After completing remaining tasks:
1. Start dev server: `npm run dev`
2. Visit http://localhost:9002
3. Register a new account with your Gemini API key
4. Test translation features
5. Logout and login again to verify persistence
