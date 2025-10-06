import * as dotenv from 'dotenv';
import * as path from 'path';
import './custom-matchers';

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });
