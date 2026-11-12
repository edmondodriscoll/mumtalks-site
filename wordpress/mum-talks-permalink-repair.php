<?php
/**
 * Plugin Name: Mum Talks Permalink Repair
 * Description: Rebuilds WordPress rewrite rules once when activated after a site import.
 * Version: 1.0.0
 */
defined( 'ABSPATH' ) || exit;

register_activation_hook( __FILE__, static function () {
    flush_rewrite_rules( false );
} );
