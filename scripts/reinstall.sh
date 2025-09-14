echo "Removing all node_modules"
rm -rf **/node_modules **/**/node_modules
pnpm install --frozen-lockfile