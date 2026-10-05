export type KBCategory =
  | 'Hardware'
  | 'Software'
  | 'Network'
  | 'Account & Access'
  | 'Email'
  | 'HR'
  | 'Finance'
  | 'General IT';

export interface KBArticle {
  id: string;
  title: string;
  category: KBCategory;
  shortDescription: string;
  problem: string;
  solution: string[];
  relatedArticles?: string[]; // Article IDs
  updatedAt: string;
  views?: number;
}

export const INITIAL_KB_ARTICLES: KBArticle[] = [
  // 1. Hardware
  {
    id: 'kb-hw-101',
    title: 'Troubleshooting a Laptop That Will Not Power On',
    category: 'Hardware',
    shortDescription: 'Step-by-step guide to power cycle laptop, verify AC adapter, and isolate hardware failures.',
    problem: 'Laptop display remains black, power indicator LEDs are off, and system fails to boot when pressing the power button.',
    solution: [
      'Disconnect all external peripherals including USB drives, external monitors, and docking stations.',
      'Unplug the AC power adapter from both the wall outlet and the laptop port.',
      'Press and hold the power button for 30 continuous seconds to drain flea power residual capacitance.',
      'Reconnect the AC adapter directly to a working wall socket (bypass power strips). Verify the LED indicator on the charger plug illuminates.',
      'Wait 2 minutes, then press the power button once. If the laptop powers on, reconnect peripherals one by one.',
      'If the power light blinks in a specific color sequence (e.g. 2 amber, 3 white), note the pattern and contact IT Support for motherboard diagnostic.'
    ],
    relatedArticles: ['kb-hw-110', 'kb-hw-111'],
    updatedAt: '2026-09-20',
    views: 342,
  },
  {
    id: 'kb-hw-102',
    title: 'Resolving Slow Laptop Performance and High CPU Usage',
    category: 'Hardware',
    shortDescription: 'How to diagnose background resource hogs, manage startup processes, and free memory.',
    problem: 'Laptop is sluggish, applications take minutes to open, and fan noise is continuously loud.',
    solution: [
      'Open Task Manager (Ctrl + Shift + Esc on Windows) or Activity Monitor (Cmd + Space -> Activity Monitor on macOS).',
      'Click the CPU column header to sort by highest usage. Identify any non-essential process consuming >50% CPU.',
      'If Google Chrome or Teams is consuming high memory, close inactive browser tabs and restart the application.',
      'Check internal storage: Ensure at least 15% (or 25 GB) of C: drive remains free for virtual memory swap space.',
      'Disable unnecessary startup apps under Task Manager > Startup Apps tab.',
      'Restart the system. If performance remains slow, run a diagnostic hardware scan via BIOS (F12 on boot).'
    ],
    relatedArticles: ['kb-hw-110', 'kb-sw-203'],
    updatedAt: '2026-09-18',
    views: 512,
  },
  {
    id: 'kb-hw-103',
    title: 'Fixing Built-in or External Keyboard Input Issues',
    category: 'Hardware',
    shortDescription: 'Troubleshoot unresponsive keys, incorrect character outputs, or full keyboard failure.',
    problem: 'Keyboard keys do not respond when typed, or typing outputs incorrect characters/repeating letters.',
    solution: [
      'Check for mechanical obstructions or dust around keys. Clean carefully with compressed air.',
      'For wireless keyboards, replace batteries or connect the USB charging cable for 15 minutes.',
      'Verify keyboard layout setting in Windows (Settings > Time & Language > Language & Region) to ensure English (US) is selected.',
      'Open Device Manager, expand "Keyboards", right-click your keyboard driver, and select "Uninstall Device". Restart laptop to auto-reinstall driver.',
      'If using a laptop, test with an external USB keyboard to verify if issue is isolated to laptop internal hardware.'
    ],
    relatedArticles: ['kb-hw-104', 'kb-gen-802'],
    updatedAt: '2026-09-15',
    views: 189,
  },
  {
    id: 'kb-hw-104',
    title: 'Wireless or Wired Mouse Cursor Unresponsive',
    category: 'Hardware',
    shortDescription: 'Resolving mouse lag, frozen cursor, or erratic mouse movement.',
    problem: 'Mouse pointer is frozen on screen, erratic, or not responding to clicks.',
    solution: [
      'For Bluetooth mouse: Turn Bluetooth off and back on in Settings, then re-pair mouse.',
      'For USB Dongle mouse: Unplug receiver, plug into a different USB port directly on laptop (avoid unpowered hubs).',
      'Ensure optical sensor on the bottom of mouse is clean and free of lint.',
      'Press Fn + Touchpad toggle key (or F6/F9 depending on laptop brand) to ensure touchpad was not accidentally disabled.',
      'Restart mouse using power switch on bottom of device.'
    ],
    relatedArticles: ['kb-hw-103', 'kb-hw-112'],
    updatedAt: '2026-09-10',
    views: 145,
  },
  {
    id: 'kb-hw-105',
    title: 'External Monitor Not Displaying Image or Saying No Signal',
    category: 'Hardware',
    shortDescription: 'Fix external display detection, black screen, resolution mismatch, and cable connectivity.',
    problem: 'Connected external monitor stays black or displays "No Signal / Cable Not Connected".',
    solution: [
      'Verify monitor power cable is plugged in and power light is ON.',
      'Press "Source / Input" button on monitor frame to switch between HDMI, DisplayPort, or USB-C input options.',
      'On Windows, press Win + P and select "Duplicate" or "Extend".',
      'Unplug DisplayPort / HDMI / USB-C adapter cable, wait 5 seconds, and re-plug securely.',
      'Update graphics display driver via Windows Device Manager > Display Adapters.'
    ],
    relatedArticles: ['kb-hw-101', 'kb-gen-807'],
    updatedAt: '2026-09-22',
    views: 290,
  },
  {
    id: 'kb-hw-106',
    title: 'Office Printer Not Printing or Documents Queued in Spooler',
    category: 'Hardware',
    shortDescription: 'Clearing print queue stuck jobs, reconnecting network printer, and resolving driver offline status.',
    problem: 'Print job stays queued, printer status shows Offline, or printer fails to respond.',
    solution: [
      'Verify printer is connected to office network (either Wi-Fi or Ethernet cable) and paper tray is loaded.',
      'Open Settings > Devices > Printers & Scanners. Click printer and choose "Open Queue". Right-click stuck jobs and select "Cancel".',
      'Restart Printer Spooler service: Press Win + R, type "services.msc", scroll to "Print Spooler", right-click and click "Restart".',
      'Ensure GlobalProtect VPN is active if printing remotely to office network printers.',
      'Remove printer device and re-add using network IP address provided by IT department.'
    ],
    relatedArticles: ['kb-net-304', 'kb-gen-802'],
    updatedAt: '2026-09-14',
    views: 410,
  },
  {
    id: 'kb-hw-107',
    title: 'Webcam Not Detected or Black Screen in Zoom/Teams',
    category: 'Hardware',
    shortDescription: 'Fix privacy shutter physical block, app privacy permissions, and video driver resets.',
    problem: 'Camera shows black screen, error "No Camera Found", or failed video feed during calls.',
    solution: [
      'Check physical camera slider switch at top of laptop screen to ensure lens privacy shutter is open.',
      'Go to Windows Settings > Privacy & Security > Camera. Ensure "Camera Access" and "Let apps access your camera" are turned ON.',
      'Close conflicting apps that might be holding camera handle (e.g., Skype, Webex, Chrome).',
      'In Teams or Zoom Settings > Video, verify correct camera device is selected in dropdown.',
      'Disable and re-enable camera under Device Manager > Cameras.'
    ],
    relatedArticles: ['kb-sw-201', 'kb-hw-108'],
    updatedAt: '2026-09-24',
    views: 378,
  },
  {
    id: 'kb-hw-108',
    title: 'Microphone Not Picked Up or Low Audio Output in Calls',
    category: 'Hardware',
    shortDescription: 'Troubleshoot internal and headset microphone input levels and Windows privacy toggles.',
    problem: 'Meeting participants cannot hear your voice or microphone input bar does not register sound.',
    solution: [
      'Check physical mute button on headset inline cable or keyboard Fn key.',
      'Navigate to Windows Settings > Sound > Input. Select correct input device and test microphone volume level.',
      'Go to Windows Settings > Privacy > Microphone and turn ON "Let desktop apps access your microphone".',
      'In Teams / Zoom audio settings, switch input device from "System Default" to explicit headset name.',
      'Run Windows Recording Audio Troubleshooter.'
    ],
    relatedArticles: ['kb-hw-109', 'kb-sw-201'],
    updatedAt: '2026-09-19',
    views: 265,
  },
  {
    id: 'kb-hw-109',
    title: 'No Audio Output or Speaker Sound Distortion',
    category: 'Hardware',
    shortDescription: 'Resolving muted audio playback, audio driver playback device routing, and bluetooth headsets.',
    problem: 'No sound comes out of laptop speakers or connected headset, or audio is distorted.',
    solution: [
      'Click speaker icon in system tray and verify volume slider is above 0 and not muted.',
      'Click playback device arrow next to volume slider and choose correct audio output (e.g. Headphones vs Realtek Audio).',
      'Unplug and re-plug audio 3.5mm jack or USB dongle.',
      'If using Bluetooth headset, disconnect and reconnect headset from Bluetooth settings menu.',
      'Restart Audio services via services.msc > Windows Audio -> Restart.'
    ],
    relatedArticles: ['kb-hw-108'],
    updatedAt: '2026-09-12',
    views: 210,
  },
  {
    id: 'kb-hw-110',
    title: 'Laptop Overheating and High Fan Noise Prevention',
    category: 'Hardware',
    shortDescription: 'How to manage thermal throttling, clean air vents, and optimize power plan settings.',
    problem: 'Laptop chassis gets hot to touch, system slows down dramatically, and cooling fan spins continuously.',
    solution: [
      'Place laptop on a flat hard surface (desk). Avoid using laptop on soft surfaces like beds or couches that block bottom air intake vents.',
      'Clear vent dust using canned compressed air while system is turned off.',
      'Set Windows Power Mode to "Balanced" or "Best Energy Efficiency" in Settings > System > Power.',
      'Close resource-intensive background processes in Task Manager.',
      'Elevate back of laptop slightly to increase airflow clearance.'
    ],
    relatedArticles: ['kb-hw-102', 'kb-hw-111'],
    updatedAt: '2026-09-11',
    views: 315,
  },
  {
    id: 'kb-hw-111',
    title: 'Laptop Battery Draining Rapidly or Charge Not Holding',
    category: 'Hardware',
    shortDescription: 'Diagnose battery wear health percentage, screen brightness impact, and power management.',
    problem: 'Battery runs out in under 1 hour or status shows "Plugged in, not charging".',
    solution: [
      'Generate Battery Health Report: Open Command Prompt as Admin and run `powercfg /batteryreport`. Open generated HTML file to check full charge capacity vs design capacity.',
      'Lower screen brightness to 50% or enable Auto-Brightness.',
      'Unplug external power-hungry USB devices when running on battery.',
      'Check AC adapter wattage rating to ensure original manufacturer charger is used (65W/90W/130W).',
      'If battery capacity has degraded below 50% design capacity, submit a ticket for hardware battery replacement.'
    ],
    relatedArticles: ['kb-hw-101', 'kb-hw-110'],
    updatedAt: '2026-09-21',
    views: 480,
  },
  {
    id: 'kb-hw-112',
    title: 'External USB Drive, Hard Drive, or Flash Drive Not Detected',
    category: 'Hardware',
    shortDescription: 'Mounting external storage, assigning drive letters in Disk Management, and USB root hub resets.',
    problem: 'Plugging USB storage drive does not show up in File Explorer / This PC.',
    solution: [
      'Try connecting drive to a different USB port on laptop.',
      'Open Windows Disk Management (press Win + X -> Disk Management). Verify if drive appears in lower pane.',
      'If drive is visible in Disk Management without a drive letter, right-click partition and select "Change Drive Letter and Paths" -> Assign letter (e.g., E:).',
      'Check if drive requires BitLocker decryption password or corporate data protection policy clearance.',
      'Test external drive on another machine to confirm cable hardware integrity.'
    ],
    relatedArticles: ['kb-hw-104', 'kb-acc-406'],
    updatedAt: '2026-09-08',
    views: 195,
  },

  // 2. Software
  {
    id: 'kb-sw-201',
    title: 'Application Fails to Launch or Displays Immediate Error',
    category: 'Software',
    shortDescription: 'Troubleshoot non-starting applications, missing DLL dependencies, and administrative launch rights.',
    problem: 'Double-clicking application icon results in spinning wheel then nothing happens, or immediate crash popup.',
    solution: [
      'Right-click application icon and choose "Run as Administrator".',
      'Check Task Manager for hidden zombie instances of the process. End process tree and try re-opening.',
      'Verify system compatibility and ensure Windows Updates are fully up to date.',
      'Repair application installation via Control Panel > Programs and Features -> Select app -> Change -> Repair.',
      'Clear application local temp cache folder under `%appdata%` or `%localappdata%`.'
    ],
    relatedArticles: ['kb-sw-202', 'kb-sw-203'],
    updatedAt: '2026-09-25',
    views: 420,
  },
  {
    id: 'kb-sw-202',
    title: 'Application Crashing Intermittently During Work',
    category: 'Software',
    shortDescription: 'Fix application crashes caused by corrupt config files, graphics acceleration, or plugin conflicts.',
    problem: 'Software closes unexpectedly mid-task without saving work.',
    solution: [
      'Disable Hardware Graphics Acceleration in application preference settings (e.g. MS Office / Chrome settings).',
      'Check for available application software updates or patches from official Software Center / Company App Store.',
      'Temporarily disable third-party add-ins or browser extensions.',
      'Reset application preferences back to factory defaults.',
      'Check Windows Event Viewer (Eventvwr.msc > Windows Logs > Application) for faulting module details.'
    ],
    relatedArticles: ['kb-sw-201', 'kb-sw-204'],
    updatedAt: '2026-09-17',
    views: 310,
  },
  {
    id: 'kb-sw-203',
    title: 'Installing Approved Corporate Software from Company App Portal',
    category: 'Software',
    shortDescription: 'How to install licensed software without requiring local admin password credentials.',
    problem: 'Employee needs software (e.g., Figma, VS Code, Slack, Acrobat Reader) installed on corporate machine.',
    solution: [
      'Open Start Menu and search for "Company Portal" or "Software Center".',
      'Browse or search the catalog for approved internal applications.',
      'Click desired software package and click "Install". The system will silently deploy software with elevated privileges.',
      'Do not download software setup EXEs directly from public internet sites if blocked by admin policy.',
      'If software requires paid license key authorization, raise an Access & Permissions ticket.'
    ],
    relatedArticles: ['kb-acc-405', 'kb-gen-802'],
    updatedAt: '2026-09-23',
    views: 650,
  },
  {
    id: 'kb-sw-204',
    title: 'Resolving Software Update Failure or Pending Installation Loop',
    category: 'Software',
    shortDescription: 'Clear stuck software update downloads and re-trigger patch installation cycle.',
    problem: 'Software update gets stuck at 99%, repeatedly fails to install, or prompts for reboot continuously.',
    solution: [
      'Save all open work and restart laptop to complete pending background installation handlers.',
      'Open Software Center > Installation Status tab. Click "Retry All".',
      'Delete temporary update payload cache: Stop Windows Update service, clear files in `C:\\Windows\\SoftwareDistribution\\Download`, then restart service.',
      'Ensure device is connected to company network or GlobalProtect VPN for domain validation.',
      'Verify hard drive has at least 10 GB free space.'
    ],
    relatedArticles: ['kb-sw-203', 'kb-net-304'],
    updatedAt: '2026-09-16',
    views: 275,
  },
  {
    id: 'kb-sw-205',
    title: 'Browser Pages Not Loading or Displaying Security Certificate Warning',
    category: 'Software',
    shortDescription: 'Fix web browser SSL certificate errors, cache corruption, and proxy configuration issues.',
    problem: 'Browser shows "Your connection is not private" or ERR_CERT_AUTHORITY_INVALID on corporate websites.',
    solution: [
      'Verify system Date & Time zone on laptop is correct. Out-of-sync time breaks SSL validation.',
      'Clear browser Cache and Cookies (Ctrl + Shift + Delete -> All Time).',
      'Ensure GlobalProtect VPN is connected if accessing internal intranet portals.',
      'Try opening page in Incognito / Private window to rule out bad browser extensions.',
      'Reset browser network proxy settings to "Automatically detect settings".'
    ],
    relatedArticles: ['kb-net-307', 'kb-net-304'],
    updatedAt: '2026-09-24',
    views: 390,
  },
  {
    id: 'kb-sw-206',
    title: 'Single Sign-On (SSO) Application Login Failure or Redirect Loop',
    category: 'Software',
    shortDescription: 'Troubleshoot Okta / Azure AD authentication loop, expired tokens, and browser cookie blocks.',
    problem: 'Logging into enterprise applications loops back endlessly to login screen or gives 403 Forbidden.',
    solution: [
      'Clear browser cookies for domain `company.com` and `okta.com` / `microsoftonline.com`.',
      'Close all browser windows and open a fresh browser session.',
      'Verify mobile Authenticator OTP push notification was approved.',
      'If login fails across multiple enterprise apps, check if network password expired.',
      'Clear DNS cache: Open CMD and execute `ipconfig /flushdns`.'
    ],
    relatedArticles: ['kb-acc-401', 'kb-acc-403'],
    updatedAt: '2026-09-22',
    views: 530,
  },
  {
    id: 'kb-sw-207',
    title: 'Application Unresponsive or Completely Frozen Screen',
    category: 'Software',
    shortDescription: 'Force-closing hung applications safely and recovering unsaved document backups.',
    problem: 'Application window displays "(Not Responding)" title bar and mouse cursor turns into loading wheel.',
    solution: [
      'Wait 60 seconds for heavy background query operations to finish.',
      'Press Ctrl + Shift + Esc to launch Task Manager.',
      'Select frozen application under Processes tab and click "End Task".',
      'Re-open application. Most productivity software (Word, Excel, Figma) will offer Auto-Recovered document files on boot.',
      'Avoid running multiple memory-heavy tools concurrently if RAM capacity is constrained.'
    ],
    relatedArticles: ['kb-hw-102', 'kb-sw-201'],
    updatedAt: '2026-09-14',
    views: 220,
  },
  {
    id: 'kb-sw-208',
    title: 'Resolving Missing Application Permission Errors',
    category: 'Software',
    shortDescription: 'How to request elevated role-based group permissions for software modules.',
    problem: 'Opening module shows error "Access Denied: You do not have permission to execute this feature".',
    solution: [
      'Confirm with your team lead whether your user account is provisioned for this specific security role group.',
      'Log out of application and log back in to refresh active session security tokens.',
      'If permission was recently granted, wait up to 2 hours for Active Directory security group sync.',
      'If access is required for job duties, submit a request via Access & Permissions ticket in Ticketing Portal.',
      'Provide manager approval confirmation attachment with ticket submission.'
    ],
    relatedArticles: ['kb-acc-404', 'kb-gen-807'],
    updatedAt: '2026-09-20',
    views: 310,
  },

  // 3. Network
  {
    id: 'kb-net-301',
    title: 'General Internet Disconnection & Network Connectivity Failure',
    category: 'Network',
    shortDescription: 'Basic network adapter troubleshooting, IP address renewal, and router connection diagnostics.',
    problem: 'Laptop shows "No Internet Access", yellow exclamation mark on Wi-Fi icon, or web pages fail to load.',
    solution: [
      'Toggle Wi-Fi switch off, wait 10 seconds, and turn back on.',
      'Verify physical Ethernet cable is securely latched into wall jack or dock (if wired).',
      'Open Command Prompt and run `ipconfig /release` followed by `ipconfig /renew`.',
      'Flush DNS cache by running `ipconfig /flushdns`.',
      'Restart computer to reset network adapter interface drivers.'
    ],
    relatedArticles: ['kb-net-302', 'kb-net-303'],
    updatedAt: '2026-09-24',
    views: 610,
  },
  {
    id: 'kb-net-302',
    title: 'Wi-Fi Network Fails to Connect or Asks for Credentials Continuously',
    category: 'Network',
    shortDescription: 'Connecting to Corporate Secure Wi-Fi, forgetting old profile passwords, and 802.1X auth.',
    problem: 'Connecting to "Company-Corporate" SSID fails with "Can\'t connect to this network" error.',
    solution: [
      'Open Wi-Fi settings, right-click "Company-Corporate" network, and click "Forget Network".',
      'Select network again from available list. When prompted, enter your current active network domain credentials.',
      'If connecting from remote home office, ensure home router WPA2/WPA3 password is entered correctly.',
      'Check if MAC address filtering or device compliance block is active on network profile.',
      'Run Windows Network Diagnostics troubleshooter.'
    ],
    relatedArticles: ['kb-net-301', 'kb-gen-801'],
    updatedAt: '2026-09-23',
    views: 490,
  },
  {
    id: 'kb-net-303',
    title: 'Troubleshooting Slow Internet Speed & High Network Latency',
    category: 'Network',
    shortDescription: 'Isolating bandwidth hogs, switching frequency bands, and VPN speed optimization.',
    problem: 'Video calls lag, file downloads take hours, and website loading is sluggish.',
    solution: [
      'Run an online speed test (e.g. speedtest.net) to record download/upload throughput and ping latency.',
      'If on Wi-Fi, move closer to wireless access point or switch to 5 GHz frequency band instead of 2.4 GHz.',
      'Disconnect bandwidth-heavy background downloads (e.g. OneDrive full sync or cloud backups).',
      'If connected to VPN while doing non-work web browsing, test disconnecting VPN if allowed by security policy.',
      'Connect via wired RJ45 Ethernet cable for maximum stability during critical video conferences.'
    ],
    relatedArticles: ['kb-net-304', 'kb-net-305'],
    updatedAt: '2026-09-19',
    views: 340,
  },
  {
    id: 'kb-net-304',
    title: 'GlobalProtect VPN Client Connection Failure or Staging Errors',
    category: 'Network',
    shortDescription: 'Resolving VPN gateway connection error, portal authentication failures, and portal address configs.',
    problem: 'GlobalProtect client shows "Could not connect to gateway" or gets stuck in "Connecting" state.',
    solution: [
      'Verify portal URL is set to `vpn.company.com` (or regional portal `apac-vpn.company.com`).',
      'Ensure local internet connectivity is active BEFORE launching VPN client.',
      'Click GlobalProtect gear icon > Settings > Select connection -> Click "Refresh Connection".',
      'Re-authenticate using current network password and Approve MFA push alert on mobile device.',
      'If certificate error occurs, restart GlobalProtect Service: Press Win + R -> `services.msc` -> PanGPS service -> Restart.'
    ],
    relatedArticles: ['kb-net-305', 'kb-gen-804'],
    updatedAt: '2026-09-25',
    views: 820,
  },
  {
    id: 'kb-net-305',
    title: 'Fixing Intermittent Network Connection Drops During Remote Work',
    category: 'Network',
    shortDescription: 'Prevent Wi-Fi power saving sleep mode, DNS drops, and VPN auto-reconnect loops.',
    problem: 'Connection drops every 15-30 minutes, disconnecting VPN and active SSH / RDP sessions.',
    solution: [
      'Disable Wi-Fi Adapter Power Saving: Open Device Manager > Network Adapters -> Right-click Wi-Fi card -> Properties -> Power Management -> Uncheck "Allow the computer to turn off this device to save power".',
      'Change home router Wi-Fi channel from Auto to fixed non-overlapping channel (1, 6, or 11).',
      'Update Wi-Fi network card drivers to latest manufacturer release.',
      'Ensure VPN client version is up to date via Software Center.',
      'Avoid using mobile phone hotspot in weak coverage areas for prolonged work.'
    ],
    relatedArticles: ['kb-net-303', 'kb-net-304'],
    updatedAt: '2026-09-15',
    views: 310,
  },
  {
    id: 'kb-net-306',
    title: 'Resolving Corporate Domain DNS Resolution Errors (DNS_PROBE_FINISHED_NXDOMAIN)',
    category: 'Network',
    shortDescription: 'Configuring corporate DNS servers, clearing local hosts file overrides, and DNS flush.',
    problem: 'Internal hostnames (e.g. `jira.internal.company.com`) fail to resolve while public websites work fine.',
    solution: [
      'Ensure GlobalProtect VPN is connected if working remotely.',
      'Verify Network Adapter IPv4 settings: Set DNS server address to "Obtain DNS server address automatically".',
      'Open CMD as Admin and execute `ipconfig /flushdns` and `netsh winsock reset`.',
      'Restart computer to apply socket layer resets.',
      'Test pinging internal DNS IP `10.0.0.2` to check tunnel connectivity.'
    ],
    relatedArticles: ['kb-net-304', 'kb-net-307'],
    updatedAt: '2026-09-12',
    views: 245,
  },
  {
    id: 'kb-net-307',
    title: 'Cannot Access Internal Company Intranet or Web Apps',
    category: 'Network',
    shortDescription: 'Resolving HTTP 403/404/502 errors when accessing internal company web tools.',
    problem: 'Internal intranet websites fail to load or show connection timeout page.',
    solution: [
      'Verify VPN status: Ensure GlobalProtect shows "Connected" status.',
      'Check if internal service is currently undergoing scheduled maintenance on the IT Status Dashboard.',
      'Try accessing site using explicit HTTPS URL (`https://intranet.company.com`).',
      'Bypass proxy server for local intranet addresses in Internet Options > Connections > LAN Settings.',
      'Clear browser cache or try an alternate browser (Chrome / Edge / Firefox).'
    ],
    relatedArticles: ['kb-sw-205', 'kb-net-304'],
    updatedAt: '2026-09-21',
    views: 430,
  },
  {
    id: 'kb-net-308',
    title: 'Cannot Access Shared Network Drive / Folder (\\\\nas\\shared)',
    category: 'Network',
    shortDescription: 'Mapping network drives, credential manager clearance, and SMB file sharing authorization.',
    problem: 'Windows Explorer shows "Network Path Not Found" or red X on mapped drive Z:.',
    solution: [
      'Ensure laptop is connected to office network or GlobalProtect VPN.',
      'Open Windows File Explorer, right-click "This PC" and select "Map Network Drive".',
      'Type full UNC path (e.g. `\\\\nas.company.com\\departments\\hr`) and check "Connect using different credentials" if needed.',
      'When prompted, type domain credentials as `COMPANY\\username`.',
      'Clear stale Windows Credential Manager cached entries under Control Panel > Credential Manager > Windows Credentials.'
    ],
    relatedArticles: ['kb-acc-406', 'kb-gen-803'],
    updatedAt: '2026-09-20',
    views: 520,
  },

  // 4. Account & Access
  {
    id: 'kb-acc-401',
    title: 'How to Reset Your Forgotten Network & Email Password',
    category: 'Account & Access',
    shortDescription: 'Self-service password reset portal guide, password policy requirements, and unlock instructions.',
    problem: 'Forgot corporate network password or password has expired.',
    solution: [
      'Navigate to Self-Service Password Portal at `https://password.company.com` from any device or mobile phone.',
      'Enter your corporate email address (`username@company.com`) and click Next.',
      'Complete Multi-Factor Authentication (MFA) via SMS OTP or Microsoft Authenticator app notification.',
      'Enter a new password meeting policy guidelines (At least 12 characters, including uppercase, lowercase, number, and special symbol).',
      'Wait 2 minutes for domain synchronization across all cloud services (Email, VPN, Wi-Fi, HR portal).'
    ],
    relatedArticles: ['kb-acc-402', 'kb-gen-805'],
    updatedAt: '2026-09-24',
    views: 950,
  },
  {
    id: 'kb-acc-402',
    title: 'Unlocking Account After Exceeding Maximum Failed Login Attempts',
    category: 'Account & Access',
    shortDescription: 'How to unlock auto-locked accounts due to invalid password attempts or cached credentials on old mobile phones.',
    problem: 'Login screen shows "Your account has been locked. Contact your system administrator."',
    solution: [
      'Accounts automatically unlock after 15 minutes of zero login attempts.',
      'IMPORTANT: Turn off Wi-Fi on mobile phones/tablets that may be repeatedly attempting background email sync with an OLD saved password.',
      'If account does not auto-unlock after 15 minutes, use Self-Service Reset Portal (`https://password.company.com`) and select "Unlock My Account".',
      'Update saved passwords across all mobile email apps before reconnecting to Wi-Fi.',
      'Contact IT Support Helpdesk if lockouts continue repeatedly.'
    ],
    relatedArticles: ['kb-acc-401', 'kb-acc-403'],
    updatedAt: '2026-09-22',
    views: 610,
  },
  {
    id: 'kb-acc-403',
    title: 'Resolving Login & Authentication Failures on Corporate Apps',
    category: 'Account & Access',
    shortDescription: 'Diagnose invalid username/password errors, expired tokens, and tenant access locks.',
    problem: 'Login rejected on enterprise web applications despite using correct password.',
    solution: [
      'Verify Caps Lock is not turned on.',
      'Ensure username format includes full domain prefix or email suffix (e.g. `john.doe@company.com`).',
      'Check if password recently expired (passwords expire every 90 days per compliance policy).',
      'Clear browser cache and restart browser.',
      'If login issue persists, raise an Account & Access support ticket.'
    ],
    relatedArticles: ['kb-acc-401', 'kb-sw-206'],
    updatedAt: '2026-09-18',
    views: 340,
  },
  {
    id: 'kb-acc-404',
    title: 'Resolving "Access Denied" or Permission Required Errors',
    category: 'Account & Access',
    shortDescription: 'Requesting permission escalation and Active Directory group assignment.',
    problem: 'Opening document or folder shows "You don\'t currently have permission to access this folder".',
    solution: [
      'Verify with folder owner if your user account has been added to the folder ACL permissions list.',
      'Ensure GlobalProtect VPN is active if accessing folder via network drive.',
      'Log off Windows session and log back in to force Kerberos security token ticket renewal.',
      'Submit a Request Folder Access ticket via Ticketing Portal with written approval from dataset owner.',
      'Include exact path folder link in ticket description.'
    ],
    relatedArticles: ['kb-acc-406', 'kb-net-308'],
    updatedAt: '2026-09-15',
    views: 280,
  },
  {
    id: 'kb-acc-405',
    title: 'Requesting Access to a New Software Application or Cloud Tool',
    category: 'Account & Access',
    shortDescription: 'Workflow process for requesting SaaS licenses (Figma, Jira, Salesforce, Adobe CC).',
    problem: 'Employee needs access to specialized cloud software for project deliverables.',
    solution: [
      'Open Ticketing Portal and click "Create Ticket".',
      'Select Category: **Access & Permissions** and Sub-category: **Software License**.',
      'Specify exact tool name (e.g. Figma Enterprise, Jira, Adobe Creative Cloud).',
      'Attach manager email approval or cost-center code for license billing allocation.',
      'IT Service Desk will provision license within 4-8 business hours.'
    ],
    relatedArticles: ['kb-sw-203', 'kb-acc-406'],
    updatedAt: '2026-09-21',
    views: 540,
  },
  {
    id: 'kb-acc-406',
    title: 'Requesting Shared Folder or Department Directory Access',
    category: 'Account & Access',
    shortDescription: 'Step-by-step guide to request security group access for shared department network folders.',
    problem: 'Employee joined new team and requires Read/Write permissions to shared drive folders.',
    solution: [
      'Obtain written email approval from Department Manager or Data Owner.',
      'Note exact network folder path (e.g. `\\\\nas\\finance\\Q4_Reports`).',
      'Submit ticket under Category: **Access & Permissions** > **Request Folder Access**.',
      'Attach approval document to ticket.',
      'Once ticket is resolved, log off and back into computer to refresh security groups.'
    ],
    relatedArticles: ['kb-net-308', 'kb-acc-404'],
    updatedAt: '2026-09-17',
    views: 390,
  },
  {
    id: 'kb-acc-407',
    title: 'Email Account Access & Shared Mailbox Permission Setup',
    category: 'Account & Access',
    shortDescription: 'Adding delegated shared mailbox (e.g., info@company.com) to Outlook desktop client.',
    problem: 'Cannot open shared team email inbox or delegate mailbox in Outlook.',
    solution: [
      'Submit an Access Ticket requesting delegate access to target shared email address.',
      'Once access is granted by IT Admin, open Outlook desktop app.',
      'File > Account Settings > Account Settings -> Select main account -> Change -> More Settings -> Advanced tab -> Click "Add" -> Type shared mailbox email.',
      'Click Apply and OK. Restart Outlook.',
      'Shared mailbox will appear in left sidebar folder pane below primary inbox.'
    ],
    relatedArticles: ['kb-em-506', 'kb-acc-405'],
    updatedAt: '2026-09-19',
    views: 410,
  },
  {
    id: 'kb-acc-408',
    title: 'MFA / OTP Authentication Troubleshoot & New Phone Setup',
    category: 'Account & Access',
    shortDescription: 'Re-registering Authenticator app on new mobile device or resetting lost 2FA options.',
    problem: 'Lost phone, replaced mobile device, or not receiving 2FA SMS verification codes.',
    solution: [
      'If you have backup verification method (e.g. office phone call or secondary email), click "Sign in another way" on login screen.',
      'If you bought a new phone: Log into `https://mysignins.microsoft.com/security-info` from existing authenticated laptop session.',
      'Click "+ Add Sign-in Method" -> Select "Authenticator App" and scan QR code with new phone app.',
      'If completely locked out with no access to old phone, submit a ticket for IT Admin to reset your MFA registration.',
      'Once reset, you will be prompted to set up MFA afresh upon next login.'
    ],
    relatedArticles: ['kb-acc-401', 'kb-acc-402'],
    updatedAt: '2026-09-25',
    views: 710,
  },

  // 5. Email
  {
    id: 'kb-em-501',
    title: 'Fixing Outgoing Email Not Sending or Stuck in Outbox Folder',
    category: 'Email',
    shortDescription: 'Resolving stuck outbox messages, file attachment size caps, and SMTP offline mode.',
    problem: 'Composed email remains sitting in Outbox folder and will not send.',
    solution: [
      'Check Outlook bottom status bar to verify if status says "Offline" or "Disconnected". If offline, click Send/Receive tab -> Toggle "Work Offline" button off.',
      'Check attachment size: Outlook enforces a 25 MB limit per email. Remove large attachments and upload to OneDrive instead.',
      'Open Outbox folder, drag stuck email to Drafts folder, re-open email, and click Send again.',
      'Verify GlobalProtect VPN is active if sending via custom corporate SMTP server.',
      'Restart Outlook app.'
    ],
    relatedArticles: ['kb-em-503', 'kb-em-506'],
    updatedAt: '2026-09-20',
    views: 380,
  },
  {
    id: 'kb-em-502',
    title: 'Emails Not Arriving in Inbox or Delayed Email Delivery',
    category: 'Email',
    shortDescription: 'Checking spam quarantine filters, Focused Inbox tabs, and mailbox rules.',
    problem: 'Expected email sent by client or vendor has not arrived in inbox.',
    solution: [
      'Check "Junk Email" and "Deleted Items" folders in Outlook.',
      'If Focused Inbox is enabled, check "Other" tab at top of message list.',
      'Log into Cloud Email Security Quarantine Portal at `https://security.company.com` to check if external email was quarantined by spam filter.',
      'Verify sender typed your email address correctly without typos.',
      'Check if mailbox storage is 100% full (Mailbox Quota Breached).'
    ],
    relatedArticles: ['kb-em-504', 'kb-em-507'],
    updatedAt: '2026-09-18',
    views: 320,
  },
  {
    id: 'kb-em-503',
    title: 'Email Attachment Upload Blocked or Oversized File Failure',
    category: 'Email',
    shortDescription: 'Bypassing attachment size limits using corporate OneDrive share links.',
    problem: 'Error "The file you are trying to send exceeds the maximum attachment limit of 25MB".',
    solution: [
      'Upload file to your corporate OneDrive folder.',
      'Right-click file in OneDrive and select "Copy Link" or "Share". Set permissions to "People in Company with link".',
      'Paste file share link inside your email message instead of attaching physical file.',
      'For ZIP files or executable scripts blocked by security policy, upload to OneDrive and share via link.',
      'This guarantees instant delivery without clogging recipient inbox.'
    ],
    relatedArticles: ['kb-em-501', 'kb-em-507'],
    updatedAt: '2026-09-14',
    views: 290,
  },
  {
    id: 'kb-em-504',
    title: 'Reporting Suspicious Phishing & Spam Emails',
    category: 'Email',
    shortDescription: 'How to report phishing attempts securely without clicking malicious links.',
    problem: 'Received suspicious email asking for password reset, gift cards, or urgent wire transfer.',
    solution: [
      'DO NOT click any links, open attachments, or reply to sender.',
      'In Outlook toolbar, click the "Report Phishing" button.',
      'This automatically moves email to Security team queue for analysis and blocks sender domain across company firewall.',
      'If you accidentally entered credentials on a suspicious link, IMMEDIATELY change your network password at `https://password.company.com` and notify IT Security.',
      'Always verify sender email domain header carefully.'
    ],
    relatedArticles: ['kb-em-502', 'kb-acc-401'],
    updatedAt: '2026-09-24',
    views: 450,
  },
  {
    id: 'kb-em-505',
    title: 'Resolving Email Synchronization Delays Between Phone and Laptop',
    category: 'Email',
    shortDescription: 'Fix Exchange ActiveSync sync stalls, OST cache corruption, and mobile mail refresh.',
    problem: 'Emails read/deleted on mobile phone still show as unread on laptop Outlook app.',
    solution: [
      'In Outlook desktop, click Send/Receive tab -> Click "Update Folder".',
      'For mobile Outlook app: Open settings -> Select account -> Click "Reset Account" to perform clean sync.',
      'On laptop Outlook: Go to Account Settings -> Change -> Uncheck "Use Cached Exchange Mode", click Next, then re-check it and restart Outlook.',
      'Ensure background data usage is allowed for Outlook mobile app in phone settings.',
      'Verify device has steady Wi-Fi or cellular internet connection.'
    ],
    relatedArticles: ['kb-em-506', 'kb-em-501'],
    updatedAt: '2026-09-16',
    views: 230,
  },
  {
    id: 'kb-em-506',
    title: 'Microsoft Outlook Desktop App Not Opening or Stuck on "Processing"',
    category: 'Email',
    shortDescription: 'Launching Outlook in Safe Mode, disabling corrupted add-ins, and rebuilding mail profile.',
    problem: 'Outlook splash screen stays stuck on "Processing" or "Loading Profile" indefinitely.',
    solution: [
      'Launch Outlook in Safe Mode: Press Win + R, type `outlook.exe /safe` and press Enter.',
      'If Outlook opens successfully in Safe Mode, go to File > Options > Add-ins -> COM Add-ins -> Click Go -> Uncheck third-party add-ins -> Click OK.',
      'Close Safe Mode and launch Outlook normally.',
      'If still stuck, rebuild profile: Open Control Panel > Mail > Show Profiles -> Click Add to create new Outlook profile.',
      'Run SCANPST.exe tool to repair local `.ost` data file.'
    ],
    relatedArticles: ['kb-sw-201', 'kb-em-505'],
    updatedAt: '2026-09-22',
    views: 580,
  },
  {
    id: 'kb-em-507',
    title: 'Mailbox Full Warning & Clearing Mail Storage Space',
    category: 'Email',
    shortDescription: 'How to archive old emails, clean up large attachment messages, and empty deleted items.',
    problem: 'Error "Your mailbox is full. You cannot send or receive new messages."',
    solution: [
      'Empty "Deleted Items" and "Junk Email" folders: Right-click folder and select "Empty Folder".',
      'Sort Inbox by Size: Click Filter icon > Sort By -> Size (Largest on Top). Archive or delete emails with large attachments.',
      'Use Outlook Mailbox Cleanup tool: File > Tools > Mailbox Cleanup -> Click "Find items larger than 5000 KB".',
      'Enable AutoArchive: Move old emails older than 1 year to Online Archive folder (`In-Place Archive`).',
      'Contact IT Support if corporate mailbox expansion is required for compliance roles.'
    ],
    relatedArticles: ['kb-em-503', 'kb-em-502'],
    updatedAt: '2026-09-19',
    views: 370,
  },

  // 6. HR
  {
    id: 'kb-hr-601',
    title: 'Annual Leave Balance, Sick Leave, & Paid Time Off (PTO) FAQs',
    category: 'HR',
    shortDescription: 'How to check leave accrual balance, apply for leaves in Workday, and encash PTO.',
    problem: 'Employee has questions regarding leave policies, accrual cycles, or leave approval status.',
    solution: [
      'Log into HR Self-Service Portal (Workday) at `https://hr.company.com`.',
      'Navigate to Time Off & Absence applet to view current accrued leave balance.',
      'Click "Request Absence", select leave type (Casual, Sick, Maternity/Paternity, Earned), choose start and end dates.',
      'Click Submit. The request routes automatically to your reporting manager for approval.',
      'Unused earned leaves up to 10 days roll over to next calendar year automatically on Dec 31.'
    ],
    relatedArticles: ['kb-hr-602', 'kb-hr-605'],
    updatedAt: '2026-09-23',
    views: 890,
  },
  {
    id: 'kb-hr-602',
    title: 'Correcting Attendance Discrepancies & Regularizing Missing Swipes',
    category: 'HR',
    shortDescription: 'How to submit attendance regularization for missed badge swipes or remote work days.',
    problem: 'Attendance portal shows "Half Day" or "Absent" due to forgotten badge swipe.',
    solution: [
      'Log into Attendance Portal at `https://attendance.company.com`.',
      'Select date with missing swipe entry under Monthly Attendance Summary.',
      'Click "Regularize Attendance" button.',
      'Select reason (e.g. Badge Forgotten, On-Site Client Visit, Remote Work, Technical Reader Issue) and specify actual check-in / check-out times.',
      'Submit request for Manager approval before monthly payroll cutoff date (22nd of every month).'
    ],
    relatedArticles: ['kb-hr-601', 'kb-hr-603'],
    updatedAt: '2026-09-18',
    views: 470,
  },
  {
    id: 'kb-hr-603',
    title: 'Downloading Payslips, Form 16, & Tax Calculation Sheets',
    category: 'HR',
    shortDescription: 'Accessing monthly salary slips, tax withholding breakdown, and annual income certificates.',
    problem: 'Employee needs salary proof payslip for bank loan, visa application, or tax filing.',
    solution: [
      'Log into HR Portal `https://hr.company.com` using corporate credentials and MFA.',
      'Click "Pay & Compensation" icon.',
      'Select "Payslips" tab to view or download PDF copies of monthly salary statements for any month.',
      'For tax certificates, click "Tax Documents" tab -> Select Financial Year (e.g. FY 2025-26) to download Form 16.',
      'PDF payslips are password protected; password format is `UPPERCASE_PAN + DOB_DDMMYYYY`.'
    ],
    relatedArticles: ['kb-hr-604', 'kb-fin-701'],
    updatedAt: '2026-09-25',
    views: 1120,
  },
  {
    id: 'kb-hr-604',
    title: 'Updating Personal Details, Emergency Contacts, & Bank Accounts',
    category: 'HR',
    shortDescription: 'How to update residential address, phone number, emergency contacts, and payroll bank details.',
    problem: 'Employee moved to new address or changed salary credit bank account.',
    solution: [
      'Log into Workday HR Portal -> Click your Profile picture -> Select "View Profile".',
      'Click "Personal Info" tab -> Select "Contact Information" -> Edit phone number or address.',
      'For Bank Account updates: Select "Pay" tab -> "Direct Deposit / Bank Accounts" -> Click Edit -> Enter new IFSC code and Account Number.',
      'Attach cancelled cheque leaf image for bank verification.',
      'HR Operations verifies updates within 2 business days.'
    ],
    relatedArticles: ['kb-hr-603', 'kb-hr-605'],
    updatedAt: '2026-09-15',
    views: 380,
  },
  {
    id: 'kb-hr-605',
    title: 'Troubleshooting Workday / HR Portal Login & Account Access',
    category: 'HR',
    shortDescription: 'Fixing single sign-on authentication errors on HR self-service portal.',
    problem: 'Error "User account not mapped" or "Unauthorized access" when opening Workday portal.',
    solution: [
      'Ensure you are using company email address as user ID.',
      'Clear browser cookies for `workday.com` domain.',
      'If newly joined employee, note that HR portal provisioning completes 24 hours after official onboarding date.',
      'Try accessing via incognito window.',
      'If issue persists, raise an HR Ticket via Ticketing Portal.'
    ],
    relatedArticles: ['kb-sw-206', 'kb-hr-601'],
    updatedAt: '2026-09-14',
    views: 290,
  },

  // 7. Finance
  {
    id: 'kb-fin-701',
    title: 'Submitting Business Expense Claims & Travel Receipts',
    category: 'Finance',
    shortDescription: 'Step-by-step guide to log expense reports, attach itemized receipts, and submit for manager sign-off.',
    problem: 'Employee incurred out-of-pocket expenses for client dinner, travel, or office supplies.',
    solution: [
      'Log into Concur Expense Portal at `https://expense.company.com`.',
      'Click "Create New Claim" -> Enter Report Title (e.g. Q3 Client Visit Expense) and Cost Center code.',
      'Click "Add Expense Line" -> Select category (e.g. Airfare, Taxi, Meals, Hotel, Office Supplies).',
      'Upload itemized GST tax invoice receipt image (receipts must clearly show vendor name, date, and tax breakdown).',
      'Click Submit Claim. Once Manager approves, Finance processes reimbursement within 5 working days.'
    ],
    relatedArticles: ['kb-fin-702', 'kb-fin-703'],
    updatedAt: '2026-09-22',
    views: 740,
  },
  {
    id: 'kb-fin-702',
    title: 'Tracking Status of Submitted Reimbursement Claims',
    category: 'Finance',
    shortDescription: 'Understanding reimbursement approval workflow status and payment credit timelines.',
    problem: 'Submitted expense report status shows "Pending Finance Audit" or "Sent for Payment".',
    solution: [
      'Log into Expense Portal > My Claims tab.',
      'Check status column: "Manager Approved" = Awaiting Finance team validation; "Approved for Payment" = Credited in next payroll run.',
      'Reimbursements approved before 15th of month are paid on 20th; claims approved after 15th are paid with month-end salary.',
      'If claim shows "Sent Back", click claim to view audit note explaining missing itemized receipt.',
      'Re-attach required receipt and click Re-submit.'
    ],
    relatedArticles: ['kb-fin-701', 'kb-hr-603'],
    updatedAt: '2026-09-19',
    views: 410,
  },
  {
    id: 'kb-fin-703',
    title: 'Resolving Delayed Reimbursement or Incorrect Credit Amount',
    category: 'Finance',
    shortDescription: 'What to do if reimbursement payment was not credited or tax deduction was applied.',
    problem: 'Expense claim was approved but payment was not received in bank account.',
    solution: [
      'Check if salary bank account details in HR portal are accurate.',
      'Review claim line items in Expense portal to see if any expense was marked non-reimbursable per policy limits (e.g., alcohol, alcohol tip, exceeding daily hotel cap).',
      'Check email notification for audit query sent by Finance team.',
      'If payment has exceeded 7 business days post-approval, create a Finance Support ticket in Ticketing Portal.',
      'Attach Expense Report ID number.'
    ],
    relatedArticles: ['kb-fin-701', 'kb-fin-704'],
    updatedAt: '2026-09-16',
    views: 260,
  },
  {
    id: 'kb-fin-704',
    title: 'Vendor Invoice Submission & Purchase Order (PO) Matching',
    category: 'Finance',
    shortDescription: 'How to process external vendor invoices against approved PO numbers.',
    problem: 'External vendor submitted invoice for payment without valid PO reference.',
    solution: [
      'Ensure vendor invoice clearly includes Company GSTIN, PO Number, and itemized tax breakdown.',
      'Email invoice PDF to `invoices@company.com` or upload directly into SAP / Coupa portal.',
      'Verify 3-way match: PO line items must match Goods Receipt (GRN) quantity and Invoice amount.',
      'Vendor invoices are paid under Standard Net-30 payment terms from date of invoice approval.',
      'For urgent vendor payment holds, raise a Finance ticket in Ticketing Portal.'
    ],
    relatedArticles: ['kb-fin-701', 'kb-fin-703'],
    updatedAt: '2026-09-13',
    views: 310,
  },

  // 8. General IT
  {
    id: 'kb-gen-801',
    title: 'How to Connect Your Device to Office Wi-Fi Network',
    category: 'General IT',
    shortDescription: 'Connecting laptops, phones, and tablets to secure office wireless networks.',
    problem: 'First-time connection to office wireless network setup.',
    solution: [
      'Select "Company-Corporate" SSID from available Wi-Fi list.',
      'Security Type: Select WPA2-Enterprise or WPA3-Enterprise (EAP-PEAP / MSCHAPv2).',
      'Username: Enter your full corporate email address (`username@company.com`).',
      'Password: Enter your active domain network password.',
      'If prompted to trust CA Security Certificate, click "Trust" or "Validate".',
      'Your device will connect automatically whenever in range of any office branch location.'
    ],
    relatedArticles: ['kb-net-302', 'kb-gen-804'],
    updatedAt: '2026-09-25',
    views: 980,
  },
  {
    id: 'kb-gen-802',
    title: 'How to Install Approved Software from Corporate Catalog',
    category: 'General IT',
    shortDescription: 'Installing standard office applications without administrative password prompts.',
    problem: 'Need to install utilities like Slack, Zoom, VS Code, Chrome, or Adobe Reader.',
    solution: [
      'Click Windows Start Button -> Type "Software Center" (or "Company Portal" on Mac).',
      'Click "Applications" tab on left menu.',
      'Search for the software name in search bar.',
      'Click application card and click blue "Install" button.',
      'The installation executes silently in background. Once completed, status changes to "Installed".'
    ],
    relatedArticles: ['kb-sw-203', 'kb-acc-405'],
    updatedAt: '2026-09-23',
    views: 840,
  },
  {
    id: 'kb-gen-803',
    title: 'How to Access Shared Folders & Team File Directories',
    category: 'General IT',
    shortDescription: 'Mapping network file shares and accessing SharePoint document libraries.',
    problem: 'Accessing shared department files and team drives.',
    solution: [
      'Press Win + E to open File Explorer.',
      'Click "This PC" in left navigation pane.',
      'In top ribbon menu, click "Map Network Drive".',
      'Choose Drive Letter Z: and paste folder path: `\\\\nas.company.com\\shared\\your_department`.',
      'Click Finish. Enter domain credentials if prompted.'
    ],
    relatedArticles: ['kb-net-308', 'kb-acc-406'],
    updatedAt: '2026-09-20',
    views: 670,
  },
  {
    id: 'kb-gen-804',
    title: 'How to Use GlobalProtect VPN for Remote Work',
    category: 'General IT',
    shortDescription: 'Guide to secure remote connectivity when working from home or traveling.',
    problem: 'Need to connect to internal company network from outside office.',
    solution: [
      'Launch GlobalProtect client from Windows System Tray (grey shield icon near clock).',
      'Portal address: Type `vpn.company.com` and click Connect.',
      'Enter your network email and password when prompted.',
      'Approve the MFA push notification alert on your mobile phone.',
      'Shield icon turns blue with checkmark, indicating secure encrypted tunnel is established.'
    ],
    relatedArticles: ['kb-net-304', 'kb-gen-801'],
    updatedAt: '2026-09-24',
    views: 1250,
  },
  {
    id: 'kb-gen-805',
    title: 'How to Reset Your Network & Email Password',
    category: 'General IT',
    shortDescription: 'Self-service step-by-step password reset instructions.',
    problem: 'Need to change password or reset expired credential.',
    solution: [
      'Open web browser and visit `https://password.company.com`.',
      'Click "Reset My Password".',
      'Enter your corporate email address and verify captcha code.',
      'Approve mobile MFA verification.',
      'Type new compliant password (min 12 chars, uppercase, lowercase, number, symbol) and confirm.'
    ],
    relatedArticles: ['kb-acc-401', 'kb-acc-402'],
    updatedAt: '2026-09-21',
    views: 910,
  },
  {
    id: 'kb-gen-806',
    title: 'How to Contact IT Support & Helpdesk Contacts',
    category: 'General IT',
    shortDescription: 'Contact channels, urgent helpline numbers, and IT desk operating hours.',
    problem: 'Need immediate emergency IT support for critical outage.',
    solution: [
      'Self-Service Portal (Recommended): Raise ticket via Ticketing Portal for tracked response.',
      'Emergency IT Helpdesk Phone: Call +1 (800) 555-0199 (Available 24/7 for P1 Critical outages).',
      'IT Walk-Up Desk: Building A, 2nd Floor, Room 204 (Mon-Fri 8:00 AM - 6:00 PM local time).',
      'Email Support: Send query to `it.support@company.com` (Auto-creates support ticket).',
      'Slack / Teams Channel: Join `#it-helpdesk-support` for quick community Q&A.'
    ],
    relatedArticles: ['kb-gen-807', 'kb-acc-401'],
    updatedAt: '2026-09-25',
    views: 730,
  },
  {
    id: 'kb-gen-807',
    title: 'How to Raise a Support Ticket in the Ticketing Portal',
    category: 'General IT',
    shortDescription: 'Step-by-step walkthrough to submit a support request with high priority response.',
    problem: 'Encountered an issue requiring IT, HR, or Finance support specialist resolution.',
    solution: [
      'Log into Employee Ticketing Portal.',
      'Click the blue "Create Ticket" button on Dashboard or navigation sidebar.',
      'Fill in Subject, select Category, Sub-category, Target Department, and Priority level.',
      'Provide clear description of steps leading to issue and attach error screenshots or log files.',
      'Click "Create Ticket". You will receive an automated ticket confirmation number (e.g. TICK-2005) and email notification updates as technicians work on your issue.'
    ],
    relatedArticles: ['kb-gen-806', 'kb-sw-203'],
    updatedAt: '2026-09-24',
    views: 1100,
  },
];

const STORAGE_KEY_KB = 'employee_standalone_kb_articles';

export const KBService = {
  getArticles(): KBArticle[] {
    const cached = localStorage.getItem(STORAGE_KEY_KB);
    if (!cached) {
      localStorage.setItem(STORAGE_KEY_KB, JSON.stringify(INITIAL_KB_ARTICLES));
      return INITIAL_KB_ARTICLES;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return INITIAL_KB_ARTICLES;
    }
  },

  getArticleById(id: string): KBArticle | undefined {
    const articles = this.getArticles();
    return articles.find((a) => a.id === id);
  },

  getRelatedArticles(currentArticle: KBArticle): KBArticle[] {
    const all = this.getArticles();
    if (!currentArticle.relatedArticles || currentArticle.relatedArticles.length === 0) {
      // Fallback to same category articles
      return all.filter((a) => a.category === currentArticle.category && a.id !== currentArticle.id).slice(0, 3);
    }

    const matched = all.filter((a) => currentArticle.relatedArticles?.includes(a.id));
    if (matched.length < 3) {
      const sameCategory = all.filter((a) => a.category === currentArticle.category && a.id !== currentArticle.id && !matched.some((m) => m.id === a.id));
      return [...matched, ...sameCategory].slice(0, 3);
    }
    return matched.slice(0, 3);
  },

  searchArticles(query: string, category: string = 'All'): KBArticle[] {
    const articles = this.getArticles();
    const q = query.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesCategory = category === 'All' || article.category.toLowerCase() === category.toLowerCase();
      if (!matchesCategory) return false;

      if (!q) return true;

      const titleMatch = article.title.toLowerCase().includes(q);
      const descMatch = article.shortDescription.toLowerCase().includes(q);
      const problemMatch = article.problem.toLowerCase().includes(q);
      const categoryMatch = article.category.toLowerCase().includes(q);
      const solutionMatch = article.solution.some((step) => step.toLowerCase().includes(q));

      return titleMatch || descMatch || problemMatch || categoryMatch || solutionMatch;
    });
  },

  getCategoryCounts(): Record<string, number> {
    const articles = this.getArticles();
    const counts: Record<string, number> = {
      All: articles.length,
      Hardware: 0,
      Software: 0,
      Network: 0,
      'Account & Access': 0,
      Email: 0,
      HR: 0,
      Finance: 0,
      'General IT': 0,
    };

    articles.forEach((a) => {
      if (counts[a.category] !== undefined) {
        counts[a.category] += 1;
      } else {
        counts[a.category] = 1;
      }
    });

    return counts;
  },
};
