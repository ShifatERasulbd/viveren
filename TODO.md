# Task: Add Shop Mega Menu Image 2 with Full CRUD

## Progress

### Step 2: Edit SettingsController.php (Backend)
- [ ] Add `shop_menu_image_2_existing` + `shop_menu_image_2_file` validation in store() and update()
- [ ] Add `shop_menu_image_2` deletion in destroy()
- [ ] Handle `shop_menu_image_2` upload/deletion in buildPayload()

### Step 3: Edit api.js (Frontend API Layer)
- [ ] Add `shop_menu_image_2` to normalizeSettingRecord()
- [ ] Add `shop_menu_image_2` to buildSettingsPayload()
- [ ] Add form data handling for `shop_menu_image_2` in buildSettingsFormData()
- [ ] Add file check for `shop_menu_image_2_file` in hasUploadFiles()

### Step 4: Edit form.jsx (Settings Form Component)
- [ ] Add second image upload field with preview
- [ ] Pass new props for image 2

### Step 5: Edit addSettings.jsx (Add Page)
- [ ] Add state, memo, cleanup for image 2

### Step 6: Edit editSettings.jsx (Edit Page)
- [ ] Add state, memo, cleanup for image 2

### Step 7: Edit table.jsx (Settings List Table)
- [ ] Add "Shop Menu Image 2" column

### Step 8: Edit MainNav.jsx (Frontend Navigation)
- [ ] Accept `shopMegaMenuImage2` prop
- [ ] Display both images side-by-side

### Step 9: Edit Header.jsx (Frontend Header)
- [ ] Pass `shop_menu_image_2` from settings to MainNav

