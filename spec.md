# WORKERS LENS #

WorkersLens will be an API that will take an interview or media (mp3,txt,acc,webm,etc...) in it's raw form and create vectors, summarize, save to the database, and save the summary if prompted to.


## An Example of an interview flow ##

POST: /api/interview

```javascript
	interview = {

		  file: '/user/project/interviews/joeshoe-alanta-010126.acc',
		  format: {
		  	  save_summary: 'docx',
		  	  in: 'acc',
		  },
		  name: 'joe shome',
		  address: '123 Main Street, Alanta, GA.',
		  occupation: 'brick layer',
		  party: 'Republican',
		  interviewer: 'Tucker',
		  comments: 'It was a dark story night, the interview when really well!'
	}
```

### FLOW ###

The file is located on the local drive. *TODO: later this will need to be streamed if run on a server, not for V1!*
The file will need to be chunked and summarized

There are 6 pieces to this application.

1) File Management
   - YouTube downloads (yt-dlp)
   - conversions and management of filetypes. FFMPEG will be used under the hood.
   - audio files will be transcribed with wav2txt (whisper.cpp)
   - the finished 'source' of all transcribed files will be .md saved in the database
   - Objects:
     a. FFMPEG
     b. wav2txt (whisper.cpp)
     c. input and output directories
     d. PANDOC for .md -> .doc
     e. YT_DLP for youtube downloads
