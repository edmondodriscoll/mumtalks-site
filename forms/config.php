<?php
// Edit these settings after uploading the site.
return [
    // Where form submissions are emailed
    'to_email'   => 'hello@mumtalks.ie',
    // Must be an address on your own domain so emails aren't marked as spam
    'from_email' => 'Mum Talks Website <no-reply@mumtalks.ie>',

    // Optional: add newsletter sign-ups straight to Mailchimp.
    // API key: Mailchimp > Profile > Extras > API keys (looks like abc123...-us21)
    // List ID: Audience > Settings > Audience name and defaults
    'mailchimp_api_key'      => '',
    'mailchimp_list_id'      => '',
    'mailchimp_double_optin' => true,
];
