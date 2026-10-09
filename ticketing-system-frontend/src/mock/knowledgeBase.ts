import { KnowledgeBaseArticle } from '../types/knowledgeBase';

export const mockKBArticles: KnowledgeBaseArticle[] = [
  {
    id: "kb-01",
    title: "How to Reset Your Corporate Password via Okta Self-Service",
    category: "Account & Access",
    description: "Step-by-step guide on unlocking your account and resetting forgotten domain passwords without calling IT.",
    content: `### Self-Service Password Reset Guide

1. Navigate to **https://company.okta.com**
2. Click **Need help signing in?** below the login box.
3. Select **Reset Password**.
4. Enter your corporate email address or username.
5. Verification options:
   - SMS Code to your registered mobile device.
   - Push Notification via Okta Verify app.
6. Enter your new password fulfilling complexity rules (12+ characters, number, special char).
7. Submit and test sign-in across Outlook and Teams.`,
    updatedAt: "2026-09-15",
    views: 1240,
    helpfulCount: 310
  },
  {
    id: "kb-02",
    title: "Troubleshooting GlobalProtect VPN Connection & Gateway Timeouts",
    category: "Network",
    description: "Common solutions for Palo Alto GlobalProtect gateway errors, RADIUS timeouts, and split-tunneling issues.",
    content: `### GlobalProtect Troubleshooting Steps

#### Fix 1: Switch Regional Gateway
If Tokyo or London gateways time out, switch your active portal:
- Right-click GlobalProtect icon in system tray.
- Select **Settings > Gateways**.
- Choose **US-West (Oregon)** or **Asia-East (Singapore)**.

#### Fix 2: Clear Saved Credentials
1. Open GlobalProtect > Settings.
2. Click **Sign Out**.
3. Re-enter your employee email and authenticate via Okta MFA.`,
    updatedAt: "2026-09-18",
    views: 890,
    helpfulCount: 204
  },
  {
    id: "kb-03",
    title: "MacBook Pro M-Series External Monitor Setup & DisplayLink Driver Guide",
    category: "Hardware",
    description: "Instructions for configuring dual 4K monitors on Apple Silicon Macs using approved dock stations.",
    content: `### Dual Monitor Setup for macOS

Apple M1/M2/M3 base chips require DisplayLink drivers for dual external displays.

1. Download **DisplayLink Manager v1.10** from Self Service app.
2. Grant **Screen Recording permission** under System Settings > Privacy & Security.
3. Connect dock via Thunderbolt 4 port.`,
    updatedAt: "2026-09-10",
    views: 650,
    helpfulCount: 142
  },
  {
    id: "kb-04",
    title: "Resolving Outlook Web (OWA) HTTP 403 Access Denied Errors",
    category: "Email",
    description: "Fix for Azure AD Conditional Access policy conflicts blocking browser email access.",
    content: `### Outlook Web 403 Forbidden Troubleshooting

1. Ensure your device is registered with Intune MDM.
2. Clear browser cookies for \`*.office.com\` and \`*.outlook.com\`.
3. Verify system clock is synchronized with NTP server.`,
    updatedAt: "2026-09-20",
    views: 430,
    helpfulCount: 98
  },
  {
    id: "kb-05",
    title: "Requesting Software Licenses via IT Service Catalog",
    category: "Software",
    description: "How to request JetBrains, Figma, Adobe Creative Cloud, and Jira licenses through automated approval.",
    content: `### Software Licensing Process

1. Log into ApexITSM.
2. Click **Create Ticket** > Select **Software** category.
3. Attach Manager approval email screenshot.
4. SLA for standard provisioning is 4 business hours.`,
    updatedAt: "2026-09-12",
    views: 1560,
    helpfulCount: 412
  },
  {
    id: "kb-06",
    title: "WSL2 & Docker Desktop Resource Optimization on Windows 11",
    category: "Applications",
    description: "Configure `.wslconfig` to cap RAM usage and prevent system slowdowns during local container builds.",
    content: `### Setting .wslconfig RAM limits

Create file at C:\\Users\\<username>\\.wslconfig:
\`\`\`ini
[wsl2]
memory=8GB
processors=4
swap=2GB
\`\`\`
Run wsl --shutdown in PowerShell to apply settings.`,
    updatedAt: "2026-09-08",
    views: 780,
    helpfulCount: 189
  },
  {
    id: "kb-07",
    title: "Office Wi-Fi Onboarding: Connecting to Company-Secure SSID",
    category: "Network",
    description: "How to enroll mobile devices and laptops onto WPA3 Enterprise 802.1X wireless network.",
    content: `### Connecting to Company-Secure

1. Select **Company-Secure** Wi-Fi network.
2. EAP method: **PEAP**.
3. Phase 2 authentication: **MSCHAPv2**.
4. Enterprise username: your domain login without domain prefix.`,
    updatedAt: "2026-09-14",
    views: 1100,
    helpfulCount: 295
  },
  {
    id: "kb-08",
    title: "IT Security Best Practices & Reporting Phishing Emails",
    category: "General Help",
    description: "How to use the Outlook PhishAlarm button to report suspicious emails to the Security Operations Center.",
    content: `### Reporting Suspicious Emails

When receiving an unexpected email requesting credentials, wire transfers, or MFA tokens:
1. Do not click any links or open attachments.
2. Click **Report Phishing** icon in Outlook ribbon.
3. SecOps will analyze the headers automatically.`,
    updatedAt: "2026-09-01",
    views: 2100,
    helpfulCount: 620
  }
];
