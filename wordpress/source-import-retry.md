# Source-based WordPress rebuild

The second import used HTML from the source branch and rendered Vercel blog pages. The ZIP referenced existing public assets by URL to fit the WordPress upload limit. WordPress reported 29 converted documents, zero conversion errors, one unresolved internal link and one unresolved fragment link. Its quality gate still did not pass.

All 26 packaged routes returned HTTP 200 in the preview. The WordPress API returned the homepage hero as an editable image block. The car article was restored at its original blog URL as a WordPress page, and its article content was verified over HTTP.

A native WordPress post could be created and listed, but its single-post URL returned 404 in the share preview. The blog retains its imported layout and working article links while that issue is unresolved.

The preview remains in Coming Soon mode. WordPress stores its converted blocks and theme in the hosted site. Some assets still use the Vercel origin, and form submissions, search interactions and booking flows require further verification.
