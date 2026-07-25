# TODO - Hide "Add Setting" Button When Settings Data Exists

## Steps

- [x] Read all relevant files
- [x] Create plan and get user approval

### Step 1: Modify `settings.jsx` (Settings List Page)
- [x] Conditionally pass `onAdd` prop to `SettingsTable` — only pass when `settings.length === 0`

### Step 2: Modify `table.jsx` (SettingsTable Component)
- [x] Conditionally render the "Add Setting" button only when `onAdd` prop is provided (not null/undefined)

### Step 3: Test
- [x] Run `npm run dev` or `npm run build` to compile changes

