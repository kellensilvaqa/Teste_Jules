const sampleIntegrations = [
  {
    id: 'clxrovx9r000008l5g7jf8x9y', // Example CUID
    name: 'Generic Email',
    slug: 'generic-email',
    description: 'Connect to any IMAP/SMTP email account.',
    category: 'communication',
    icon: 'icon-email.svg', // Placeholder
    version: '1.0.0',
    status: 'ACTIVE', // Added status based on schema
    // workspaceId: null, // Example for a global integration
    config: { // JSON schema for connection parameters
      type: 'object',
      properties: {
        imapHost: { type: 'string', title: 'IMAP Host' },
        imapPort: { type: 'integer', title: 'IMAP Port' },
        smtpHost: { type: 'string', title: 'SMTP Host' },
        smtpPort: { type: 'integer', title: 'SMTP Port' },
        username: { type: 'string', title: 'Email Address' },
        password: { type: 'string', title: 'Password', format: 'password' },
      },
      required: ['imapHost', 'imapPort', 'smtpHost', 'smtpPort', 'username', 'password'],
    },
    auth: { // JSON describing auth type and needed fields
      type: 'basic', // Or 'credentials'
      fields: [
        { name: 'username', type: 'string', label: 'Email Address' },
        { name: 'password', type: 'password', label: 'Password' },
      ],
    },
    endpoints: { // JSON describing available actions (placeholder)
      sendEmail: {
        name: 'Send Email',
        description: 'Sends an email.',
        parameters: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
      },
      readEmails: {
        name: 'Read Emails',
        description: 'Reads unread emails.',
        parameters: {
          folder: { type: 'string', default: 'INBOX' },
        },
      },
    },
    // Added missing fields from Integration model
    credentials: {}, // Will be defined by Connection
    settings: {},
    lastSyncAt: null,
    syncFrequency: null,

  },
  {
    id: 'clxrow2z0000108l5hj2k9c7x', // Example CUID
    name: 'Basic CRM',
    slug: 'basic-crm',
    description: 'A simple CRM with API key authentication.',
    category: 'sales',
    icon: 'icon-crm.svg',
    version: '1.0.0',
    status: 'ACTIVE',
    // workspaceId: null,
    config: {
      type: 'object',
      properties: {
        baseUrl: { type: 'string', title: 'API Base URL' },
        apiKey: { type: 'string', title: 'API Key' },
      },
      required: ['baseUrl', 'apiKey'],
    },
    auth: {
      type: 'apikey',
      in: 'header', // 'query' or 'header'
      fieldName: 'X-API-KEY', // Name of the header or query parameter
      fields: [
        { name: 'apiKey', type: 'password', label: 'API Key' }
      ]
    },
    endpoints: {
      createContact: { name: 'Create Contact', parameters: { email: 'string', name: 'string' } },
      getContact: { name: 'Get Contact', parameters: { id: 'string' } },
    },
    credentials: {},
    settings: {},
    lastSyncAt: null,
    syncFrequency: null,
  },
  {
    id: 'clxrowa7x000208l5djre6z8y', // Example CUID
    name: 'Slack',
    slug: 'slack',
    description: 'Connect to your Slack workspace.',
    category: 'communication',
    icon: 'icon-slack.svg',
    version: '1.0.0',
    status: 'ACTIVE',
    // workspaceId: null,
    config: { // For OAuth2, config might define scopes or other static params
      type: 'object',
      properties: {
        workspace_url: { type: 'string', title: 'Slack Workspace URL (e.g., yourteam.slack.com)'}
      },
      required: ['workspace_url']
    },
    auth: {
      type: 'oauth2',
      provider: 'slack', // Identifier for the OAuth2 flow
      // OAuth2 specific details like auth_url, token_url, scopes would be handled by backend logic
      // or defined here if needed by a generic OAuth2 handler
      scopes: ['chat:write', 'commands', 'users:read'],
    },
    endpoints: {
      sendMessage: { name: 'Send Message', parameters: { channel: 'string', text: 'string' } },
      createChannel: { name: 'Create Channel', parameters: { name: 'string' } },
    },
    credentials: {},
    settings: {},
    lastSyncAt: null,
    syncFrequency: null,
  },
  {
    id: 'clxrowf3c000308l5c2v00k8g', // Example CUID
    name: 'Google Sheets',
    slug: 'google-sheets',
    description: 'Read and write data to Google Sheets.',
    category: 'productivity',
    icon: 'icon-gsheets.svg',
    version: '1.0.0',
    status: 'ACTIVE',
    // workspaceId: null,
    config: {
        type: 'object',
        properties: {
            spreadsheet_id: { type: 'string', title: 'Spreadsheet ID' }
        },
        required: ['spreadsheet_id']
    },
    auth: {
      type: 'oauth2',
      provider: 'google',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    },
    endpoints: {
      getSheetData: { name: 'Get Sheet Data', parameters: { sheetName: 'string', range: 'string' } },
      updateSheetData: { name: 'Update Sheet Data', parameters: { sheetName: 'string', range: 'string', values: 'array' } },
    },
    credentials: {},
    settings: {},
    lastSyncAt: null,
    syncFrequency: null,
  },
  {
    id: 'clxrowjmq000408l5e9fqh6z3', // Example CUID
    name: 'OpenWeatherMap API',
    slug: 'open-weather-map',
    description: 'Get current weather and forecasts.',
    category: 'data',
    icon: 'icon-weather.svg',
    version: '1.0.0',
    status: 'ACTIVE',
    // workspaceId: null,
    config: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', title: 'API Key (appid)' },
        units: { type: 'string', title: 'Units (metric/imperial)', default: 'metric' }
      },
      required: ['apiKey']
    },
    auth: {
      type: 'apikey',
      in: 'query',
      fieldName: 'appid',
      fields: [
          {name: 'apiKey', type: 'password', label: 'API Key'}
      ]
    },
    endpoints: {
      getCurrentWeather: { name: 'Get Current Weather', parameters: { city: 'string' } },
      getForecast: { name: 'Get 5-day Forecast', parameters: { city: 'string' } },
    },
    credentials: {},
    settings: {},
    lastSyncAt: null,
    syncFrequency: null,
  }
];

module.exports = sampleIntegrations;
