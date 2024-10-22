The files here were copied from the airbnb base rules.  Airbnb is *way* behind in supporting flat-config (and may not do it).  Right now they are saying *all* of their dependencies must be converted to flat-config before they will even start.
I've copied, and slightly edited the files to make them work with ESM and flat config, but the rules are still the same.
Over time we should migrate individual files too our own set of rules where we setup our own defaults in individual files not load a bunch of stuff and then just override it in the main eslint.config.js file.

