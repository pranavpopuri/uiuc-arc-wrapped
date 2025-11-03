# UIUC ARC/CRCE Visit Tracker

Track your visits to the ARC and CRCE facilities at UIUC.

## Features

- Upload facility access data from Active Illinois portal
- View summary statistics and visit heatmap
- Save your data for future access
- Track visit streaks and monthly usage

## Setup

1. **Netlify Deployment**:
   - Connect this repository to Netlify
   - Set environment variables in Netlify dashboard:
     - `SUPABASE_URL`
     - `SUPABASE_KEY`

2. **Database Setup**:
   - Ensure you have a Supabase database with a `user_hours` table
   - Table should have columns: `net_id`, `hours_data`, `updated_at`

## Usage

1. Enter your NetID
2. Upload HTML files exported from Active Illinois portal
3. View your visit data and heatmap
4. Save your data to avoid re-uploading files

## Data Export Instructions

See the instructions on the website for how to export your facility access data from the Active Illinois portal.
