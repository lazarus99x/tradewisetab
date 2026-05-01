const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { regex: /import\s+\{\s*useUser\s*\}\s+from\s+['"]@clerk\/nextjs['"]/g, replacement: 'import { useUser } from "@/lib/auth"' },
  { regex: /import\s+\{\s*useClerk\s*\}\s+from\s+['"]@clerk\/nextjs['"]/g, replacement: 'import { useClerk } from "@/lib/auth"' },
  { regex: /import\s+\{\s*useClerk\s*,\s*useUser\s*\}\s+from\s+['"]@clerk\/nextjs['"]/g, replacement: 'import { useClerk, useUser } from "@/lib/auth"' },
  { regex: /import\s+\{\s*useUser\s*,\s*useClerk\s*\}\s+from\s+['"]@clerk\/nextjs['"]/g, replacement: 'import { useUser, useClerk } from "@/lib/auth"' },
  { regex: /import\s+\{\s*SignOutButton\s*\}\s+from\s+['"]@clerk\/nextjs['"]/g, replacement: 'import { SignOutButton } from "@/lib/auth"' },
  
  { regex: /import\s+\{\s*auth\s*\}\s+from\s+['"]@clerk\/nextjs\/server['"]/g, replacement: 'import { auth } from "@/lib/auth-server"' },
  { regex: /import\s+\{\s*clerkClient\s*\}\s+from\s+['"]@clerk\/nextjs\/server['"]/g, replacement: 'import { clerkClient } from "@/lib/auth-server"' },
  { regex: /import\s+\{\s*currentUser\s*\}\s+from\s+['"]@clerk\/nextjs\/server['"]/g, replacement: 'import { currentUser } from "@/lib/auth-server"' },
  { regex: /import\s+\{\s*auth\s*,\s*clerkClient\s*\}\s+from\s+['"]@clerk\/nextjs\/server['"]/g, replacement: 'import { auth, clerkClient } from "@/lib/auth-server"' },
  { regex: /import\s+\{\s*clerkClient\s*,\s*auth\s*\}\s+from\s+['"]@clerk\/nextjs\/server['"]/g, replacement: 'import { clerkClient, auth } from "@/lib/auth-server"' },
];

['app', 'components'].forEach(dir => {
  walkDir(path.join(__dirname, dir), (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;
      
      replacements.forEach(({ regex, replacement }) => {
        content = content.replace(regex, replacement);
      });
      
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
    }
  });
});
console.log('Migration complete.');
