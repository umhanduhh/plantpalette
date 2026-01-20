# Plate Palette Setup Guide

## ✅ Current Status
Your app is now running successfully at **http://localhost:3000**

## Issues Fixed
1. ✅ Moved env file from `env.local` to `.env.local` (required by Next.js)
2. ✅ Consolidated app directory structure (removed `/src`, kept root `/app`)
3. ✅ Updated TypeScript paths to match new structure
4. ✅ Cleared Next.js cache and restarted dev server

## Next Steps to Use the App

### 1. Set Up Supabase Tables
You need to create these tables in your Supabase project:

#### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  username TEXT,
  weekly_goal INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `food_logs` table
```sql
CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  fdc_id INTEGER NOT NULL,
  food_name TEXT NOT NULL,
  food_data_type TEXT,
  food_nutrients JSONB,
  logged_date DATE NOT NULL,
  logged_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, logged_date);
```

#### `share_logs` table
```sql
CREATE TABLE share_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_starting_date DATE NOT NULL,
  week_ending_date DATE NOT NULL,
  foods_count INTEGER NOT NULL,
  goal_count INTEGER NOT NULL,
  platform TEXT,
  shared_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `foods` reference table (optional)
```sql
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fdc_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  data_type TEXT,
  food_nutrients JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Set Up Supabase Auth Trigger
Create a trigger to automatically create a user record when someone signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Enable Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Food logs policies
CREATE POLICY "Users can view own food logs" ON food_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs" ON food_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs" ON food_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Share logs policies
CREATE POLICY "Users can view own share logs" ON share_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own share logs" ON share_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Foods reference table is public read
CREATE POLICY "Anyone can view foods" ON foods
  FOR SELECT USING (true);
```

### 4. Configure Supabase Email Auth
In your Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000`
3. Add to **Redirect URLs**: `http://localhost:3000/auth/callback`

### 5. Test the App

1. Visit **http://localhost:3000**
2. Enter your email address
3. Check your email for the magic link
4. Click the link to sign in
5. You'll be redirected to the dashboard

## Environment Variables

Your `.env.local` file should have:
```
NEXT_PUBLIC_SUPABASE_URL=https://heagbwjshukghkpwyznm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_sCjKqnU9z9TFWXOf_w-D9w_-QIxO_Tp
NEXT_PUBLIC_USDA_API_KEY=GF3zs7fv2S7fXdhvMR8axcsOgXd0CZtLDoao3B1i
```

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Port already in use
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9
```

### Clear Next.js cache
```bash
rm -rf .next
npm run dev
```

### Font loading issues
If fonts don't load, check that the app is running and fonts are being downloaded from Google Fonts correctly.

## File Structure
```
/app
  /auth
    /callback
      route.ts          - Auth callback handler
  /components
    AddFoodModal.tsx    - Food search & add
    NutritionInfoCard.tsx - Nutrition info display
    ShareCard.tsx       - Social sharing
    WeeklyHistory.tsx   - Weekly food history
  /dashboard
    page.tsx            - Main dashboard
  /settings
    page.tsx            - Settings page
  favicon.ico
  globals.css           - Global styles
  layout.tsx            - Root layout
  page.tsx              - Landing/auth page

/lib
  nutrient-info.ts      - Nutrient mapping
  supabase.ts           - Supabase client
  types.ts              - TypeScript types
  usda-api.ts           - USDA API utilities

/.env.local            - Environment variables
```

## Support
- USDA FoodData Central API docs: https://fdc.nal.usda.gov/api-guide.html
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
