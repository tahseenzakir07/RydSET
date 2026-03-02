-- 1. Create Users Table (extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('student', 'staff')),
  department TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Rides Table
CREATE TABLE public.rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  from_lat NUMERIC NOT NULL,
  from_lng NUMERIC NOT NULL,
  to_lat NUMERIC NOT NULL,
  to_lng NUMERIC NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  vehicle_type TEXT NOT NULL,
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  price_per_km NUMERIC DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Bookings Table
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  otp_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  distance_km NUMERIC,
  total_fare NUMERIC,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(ride_id, passenger_id) -- Prevent duplicate bookings for same ride
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles: Anyone can view profiles, only user can update own
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Rides: Anyone can view, only drivers can edit/delete
CREATE POLICY "Rides are viewable by everyone." ON public.rides
  FOR SELECT USING (true);

CREATE POLICY "Drivers can create rides." ON public.rides
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own rides." ON public.rides
  FOR UPDATE USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete their own rides." ON public.rides
  FOR DELETE USING (auth.uid() = driver_id);

-- Bookings: Only involved parties can view
CREATE POLICY "Users can view their own bookings or rides they drive." ON public.bookings
  FOR SELECT USING (
    auth.uid() = passenger_id OR 
    auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id)
  );

CREATE POLICY "Passengers can create bookings." ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update their own bookings." ON public.bookings
  FOR UPDATE USING (auth.uid() = passenger_id);

-- TRIGGER FOR PROFILE CREATION ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We still log the attempt, but we use COALESCE and ON CONFLICT to prevent errors
  -- and ensure a profile always exists for RLS to work.
  INSERT INTO public.profiles (id, name, email, role, department, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNCTION TO HANDLE SEAT ADJUSTMENT
-- Restores or reduces seats based on booking status changes
CREATE OR REPLACE FUNCTION public.adjust_ride_seats()
RETURNS trigger AS $$
BEGIN
  -- Confirmation: Reduce seats
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status = 'pending') THEN
    
    UPDATE public.rides 
    SET seats_available = seats_available - 1
    WHERE id = NEW.ride_id AND seats_available > 0;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No seats available for this ride.';
    END IF;
  
  -- Deletion or Cancellation: Restore seats
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed') OR
        (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('pending', 'cancelled')) THEN
    
    UPDATE public.rides 
    SET seats_available = seats_available + 1
    WHERE id = COALESCE(NEW.ride_id, OLD.ride_id);
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Combined trigger for all booking updates/deletes
CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.adjust_ride_seats();
