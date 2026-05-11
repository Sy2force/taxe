-- Migration to add cleaned_hebrew column to questions table
-- This column is needed to store the cleaned version of Hebrew text

-- Add cleaned_hebrew column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'cleaned_hebrew'
    ) THEN
        ALTER TABLE questions ADD COLUMN cleaned_hebrew TEXT;
    END IF;
END $$;

-- Add french_understanding column if it doesn't exist (for consistency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'french_understanding'
    ) THEN
        ALTER TABLE questions ADD COLUMN french_understanding TEXT;
    END IF;
END $$;
