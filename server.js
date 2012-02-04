var http = require('http'),
	fs = require('fs'),
	url = require('url'),

	path = process.argv[2],

	contentTypes = {
	    html: 'text/html',
	    js:   'text/javascript',
	    jpg:   'image/jpeg',
			plist:'text/xml'
	},

	handlers = {

		GET: function (resource, request, response) {

			var filename = path + resource;
			if ( resource == '/' ) {
				resource = 'linker.html';
				filename = resource;
			}
			var extension = resource.split('.').pop();
			console.log( 'GET ' + filename );

			fs.stat( filename, function (error, stat) {
				if (error) {
					response.writeHead( 500, 'Error while reading %s: %s'.printf( resource, error ) );
				  response.end();
				} else {
					var filesize = stat.size;
					if ( resource == 'linker.html' ) {
						var script = '<script>var fromServer = true;</script>\n\n';
						filesize += script.length;
					}
					console.log( 'Sending ' + filesize + ' bytes' );
					response.writeHead( 200, {
						'Content-Type': contentTypes[extension] || 'text/plain',
						'Content-Length': filesize
					} );
					if ( script ) response.write( script );
					fs.createReadStream( filename )
						.on( 'error', function (err) { console.error(err) } )
						.pipe( response );
				}
			} );

		},

		PUT: function (resource, request, response) {

			var filename = path + resource;
			console.log( 'PUT' + filename );

			var body = '';
			request.on('data', function (data) { body += data.toString() } );

			request.on('end', function () {

				console.log( 'DATA: ' + body );

				fs.writeFile( filename, body, 'utf8', function (err) {
					if (err) { console.error( 'Error during write: ' + err ) };
					console.log( 'Saved file ' + filename );
					response.writeHead( 202, 'Accepted' );
					response.end();
				} );
			} );

		}

	};

console.log( 'Looking for files in ' + path );

String.prototype.printf = function () {
	var args = arguments, i = 0;
	return this.replace( /\%s/g, function () { return args[i++] } );
}

http.createServer( function (request, response) {
	var method = request.method.toUpperCase();
	var resource = url.parse(request.url).pathname;
	if ( resource.match( /\/\.\.\//g ) ) {
		response.writeHead( 403, 'Forbidden' );
		response.end();
		console.log( 'Illegal request for ' + resource );
		return;
	}
	console.log( 'Routing request for %s to %s(%s)'.printf( request.url, method, resource ) );
	var h;
	if ( h = handlers[ method ] ) {
		h( resource, request, response );
	} else {
		response.writeHead( 405, 'Method %s not allowed on resource %s'.printf( method, resource ) );
	  response.end();
	}
} ).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');