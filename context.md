Core Features for the Leverfi Platform

(USER)

User-End Features

1. KYC Verification Process

User Submission:

Users submit the following documents for verification:

Full name
Passport/ID photograph (front and back)

Selfie (for facial verification)

SSN/TIN (or equivalent national ID)

Proof of address (utility bill, bank statement)

Credit score report (optional but recommended)

Users upload these documents via a secure form in their dashboard.

Admin Review:

Submitted documents are sent to the admin dashboard for manual verification.
Admins can mark accounts as:

Verified (approved)
Rejected (fake/incomplete documents)


Pending (needs further review)

User Notification:

Users receive an in-app notification or email once their KYC status is updated (e.g., "Your account is verified!" or "Please resubmit your documents").

2. User Profile Management

Edit Profile:

Users can update their personal information (e.g., name, email, phone number, profile picture).
Users can change their password or enable two-factor authentication (2FA).

View KYC Status:

Users can check the status of their KYC submission (e.g., "Pending," "Verified," or "Rejected").
If rejected, users see a reason (e.g., "Blurry passport photo") and can resubmit documents.

Basic Account Features:

View loan history, balances, and transactions.
Log out securely.

Admin-End Features (KYC Review)

KYC Dashboard:

Admins see a list of pending KYC submissions.
Admins can click to review each user’s submitted documents.
Admins can approve, reject, or request additional documents.

User Account Actions:


Admins can send messages to users (e.g., "Please provide a clearer photo of your ID").

Tech Stack (Simple & Secure)

Frontend: React.js/Next.js (for user forms, notifications, and profile management).
Backend: Node.js + Supabase (for storing user data, documents, and KYC status).
Storage: Supabase Storage (for securely storing uploaded documents).
Security: Encrypt sensitive data (e.g., SSN, passport details).

User Flow (Step-by-Step)

User signs up → Redirects to KYC submission form.
User uploads documents → Submits for review.
Admin reviews documents → Approves/rejects.
User receives notification → Can now apply for loans if verified.

(ADMIN)

1. Loan Management System (Admin)

Create Loans: Admins can create new loan offers with custom terms (amount, interest rate, duration).
Approve/Reject Loans: Admins can review and approve or reject loan requests from users.
Pending Status: Admins can mark loans as "pending" for further review.
Manage User Accounts:

Add/subtract from user balances (e.g., deposit funds, deduct fees).
Add to user profits/losses (e.g., after trade settlements).
Deposit approved loan funds directly into user accounts.

2. Announcements (Admin to Users)

Send Pop-Up Messages: Admins can send announcements that appear as pop-ups when users log in.
Customizable Messages: Admins can write and update messages (e.g., "New loan terms available!" or "Maintenance scheduled").

How It Works (Simple Flow)

Admin Actions:

Create a loan → User applies → Admin approves/rejects/pends.
Adjust user balances (add/subtract funds, profits, or losses).
Send announcements → Users see pop-ups on login.

User Experience:

Users log in → See pop-up announcements (if any).
Users apply for loans → Admins review and update their accounts.
