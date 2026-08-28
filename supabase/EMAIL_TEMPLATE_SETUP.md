# Supabase Confirm Sign-Up Email Template

This directory contains email templates for Supabase authentication.

## Setup Instructions

### 1. Access Supabase Email Templates

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to: **Authentication** → **Email Templates**

### 2. Configure Confirm Sign-Up Template

1. Click on the **"Confirm sign up"** template
2. Copy the HTML from `confirm_signup_email_template.html`
3. Paste it into the template editor
4. Click **Save**

### 3. Template Variables

The template uses the following Supabase variable:

- **`{{ .ConfirmationURL }}`** - The email confirmation link that users click to verify their email

This is automatically populated by Supabase with the correct confirmation URL.

### 4. Customization

You can customize the template by:

- **Colors**: Update the hex color codes (`#ff6b6b`, `#ee5a6f`) to match your brand
- **Domain**: Replace `pokedle.com` with your actual domain
- **Email**: Replace `support@pokedle.com` with your actual support email
- **Logo**: Add your logo by replacing the header text with an `<img>` tag
- **Expiration Time**: Adjust the "24 hours" text if your Supabase email link expiration settings differ

### 5. Testing

1. In your Supabase dashboard, you can test the email template before deploying
2. Create a test user account to see how the email looks
3. Verify all links and styling work correctly

## Email Features

✅ Responsive design (works on mobile and desktop)
✅ Professional styling with Pokemon-themed colors
✅ Clear call-to-action button
✅ Fallback link for button-incompatible clients
✅ Expiration notice
✅ Clean footer with support information

## Notes

- The template uses inline CSS for maximum email client compatibility
- Links are secure and generated server-side by Supabase
- The confirmation URL is time-limited for security
- All user information is handled securely by Supabase
