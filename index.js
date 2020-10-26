const express = require('express');
var spotifyApi = require('spotify-web-api-node');
require('dotenv').config();
const app = express();

var client_id = process.env.SPOTIFY_CLIENT_ID;
var client_secret = process.env.SPOTIFY_CLIENT_SECRET;
var redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

var spotify = new spotifyApi({
	clientId: client_id,
	clientSecret: client_secret,
	redirectUri: redirect_uri,
});

const getAllTracks = async (playlist) => {
	let tracks = [];
	const { body } = await spotify.getPlaylistTracks(playlist);
	tracks = body.items;
	if (body.total > 100)
		for (let i = 1; i < Math.ceil(body.total / 100); i++) {
			const add = await spotify.getPlaylistTracks(playlist, { offset: 100 * i });
			tracks = [...tracks, ...add.body.items];
		}
	return tracks; // returns needed shit
};

var scopes =
	'user-read-private user-read-email playlist-read-collaborative playlist-read-private streaming app-remote-control user-read-playback-state user-modify-playback-state user-read-currently-playing';
var songs = ['sdmnsdmlflkmsfdfkljfjlgjh'];

app.get('/login', function (req, res) {
	res.redirect(
		'https://accounts.spotify.com/authorize' +
		'?response_type=code' +
		'&client_id=' +
		client_id +
		(scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
		'&redirect_uri=' +
		encodeURIComponent(redirect_uri)
	);
});

app.get('/callback', async function (req, res) {
	if (!req.query['code']) return res.status(500).send('missing code');

	spotify.authorizationCodeGrant(req.query['code']).then(
		async function (data) {
			res.status(200).send('ok');

			console.log('The token expires in ' + data.body['expires_in']);
			console.log('The access token is ' + data.body['access_token']);
			console.log('The refresh token is ' + data.body['refresh_token']);

			// Set the access token on the API object to use it in later calls
			spotify.setAccessToken(data.body['access_token']);
			spotify.setRefreshToken(data.body['refresh_token']);

			setInterval(function () {
				spotify.refreshAccessToken().then(
					function (data) {
						console.log('The access token has been refreshed!');

						// Save the access token so that it's used in future calls
						spotify.setAccessToken(data.body['access_token']);
					},
					function (err) {
						console.log('Could not refresh access token', err);
					}
				);
			}, 3500000);

			async function refreshSongs() {
				try {
					let meData = await spotify.getMe();
					let playlistData = await spotify.getUserPlaylists({ userId: meData.body.id });
					songs = [];
					for (i in playlistData.body.items) {
						if (playlistData.body.items[i].name == 'dead songs') {
							console.log('yes');
							songs = await getAllTracks(playlistData.body.items[i].id); // runs function and sets songs as needed shit
							songs = songs.map((song) => song.track.id);
							console.log(songs.length);
						}
					}
					console.log(songs.length); // length of songs
				} catch (error) {
					return console.log(error);
				}
			}

			async function checkPlayback() {
				spotify.getMyCurrentPlaybackState().then(
					function (data) {
						//console.log('Now Playing: ', data.body);
						if (songs.includes(data.body.item.id)) {
							//console.log('EWWWWWW DEAD SONG');
							//console.log(data.body.item.id);
							spotify.skipToNext();
						} else {
							//console.log('NOT DEAD');
							//console.log(data.body.item.id);
						}
					},
					function (err) {
						console.log('Something went wrong!', err);
					}
				);
			}

			refreshSongs();
			setInterval(refreshSongs, 600000);
			setInterval(checkPlayback, 5000);

			// refreshSongs().then((idiot) => {
			// 	console.log('abc' + songs);
			// });
			//console.log(songs)
		},
		function (err) {
			res.status(403).send('invalid code');
			console.log('Something went wrong!', err);
		}
	);
});

app.listen(80, () => {
	console.log('Example app listening at http://balls');
});

// junk
