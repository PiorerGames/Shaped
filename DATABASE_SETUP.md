# Database Setup Instructions

## User Profiles Table

To enable username-based login, create this collection in your Appwrite database:

### Collection Details

- **Collection ID**: `user_profiles`
- **Collection Name**: User Profiles

### Attributes

1. **user_id** (String)

   - Type: String
   - Size: 255
   - Required: Yes

2. **username** (String)

   - Type: String
   - Size: 100
   - Required: Yes

3. **email** (String)
   - Type: String
   - Size: 255
   - Required: Yes

### Indexes

1. **username_unique**

   - Type: Unique
   - Attributes: username

2. **user_id_index**
   - Type: Key
   - Attributes: user_id

### Permissions

- **Create**: Any
- **Read**: Any (needed for login username lookup)
- **Update**: Users
- **Delete**: Users

This table maps usernames to emails, allowing users to log in with either their username or email address.

---

## User Settings Table

Stores user preferences and application settings:

### Collection Details

- **Collection ID**: `user_settings`
- **Collection Name**: User Settings

### Attributes

1. **user_id** (String)

   - Type: String
   - Size: 255
   - Required: Yes

2. **language** (String)

   - Type: String
   - Size: 10
   - Required: Yes
   - Default: "en"

3. **workflow_notifications** (Boolean)

   - Type: Boolean
   - Required: Yes
   - Default: true

4. **use_metric_units** (Boolean)

   - Type: Boolean
   - Required: Yes
   - Default: true

5. **theme_mode** (String)
   - Type: String
   - Size: 20
   - Required: No
   - Default: "system"
   - Allowed values: "system", "light", "dark", "highContrast"

### Indexes

1. **user_id_index**
   - Type: Key
   - Attributes: user_id

### Permissions

- **Create**: Users
- **Read**: Users
- **Update**: Users
- **Delete**: Users

---

## User Data Table

Stores user's personal fitness data and goals:

### Collection Details

- **Collection ID**: `user_data`
- **Collection Name**: User Data

1. **user_id** (String)
   - Type: String
   - Size: 255
   - Required: Yes
2. **age** (Integer)
   - Type: Integer
   - Required: No
3. **weight** (Float)
   - Type: Float
   - Required: No
4. **height** (Float)
   - Type: Float
   - Required: No
5. **sex** (String)
   - Type: String
   - Size: 20
   - Required: No
6. **goal** (String)
   - Type: String
   - Size: 20
   - Required: No
7. **goal_speed** (String)
   - Type: String
   - Size: 20
   - Required: No
   - Default: "moderate"

### Indexes

1. **user_id_index**
   - Type: Key
   - Attributes: user_id

### Permissions

- **Create**: Users
- **Read**: Users
- **Update**: Users
- **Delete**: Users
