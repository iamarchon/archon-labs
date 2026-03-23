#!/usr/bin/env node
// Start StackBuilder Pro local runner
// Reads AGENTFLOW_KEY and ANTHROPIC_API_KEY from .env in this directory
require('dotenv').config({ path: __dirname + '/.env' });
process.env.AGENTFLOW_SERVER = process.env.AGENTFLOW_SERVER || 'ws://localhost:3333';
// Delegate to the shared runner
require(require('path').join(__dirname, '..', '..', 'runner.js'));
