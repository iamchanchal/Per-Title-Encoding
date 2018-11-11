var ffmpeg = require('fluent-ffmpeg');

/*
 replicates this sequence of commands:

 ffmpeg -i title.mp4 -qscale:v 1 intermediate1.mpg
 ffmpeg -i source.mp4 -qscale:v 1 intermediate2.mpg
 ffmpeg -i concat:"intermediate1.mpg|intermediate2.mpg" -c copy intermediate_all.mpg
 ffmpeg -i intermediate_all.mpg -qscale:v 2 output.mp4

 Create temporary .mpg files for each video and deletes them after merge is completed.
 These files are created by filename pattern like [videoFilename.ext].temp.mpg [outputFilename.ext].temp.merged.mp4
 */

var firstFile = "../resource/BBB2min.mp4";
var secondFile = "../resource/CosmosLaundromat480_17.mp4";
var outPath = "../resource/merged480_18.mp4";

//1min video
/*var proc;
proc = ffmpeg(firstFile)
    .videoCodec('libx264')
    .audioCodec('libmp3lame')
    .size('320x240')
    .setDuration("00:01:00")
    .on('error', function (err) {
        console.log('An error occurred: ' + err.message);
    })
    .on('end', function () {
        console.log('Processing finished !');
    })
    .save(outPath);*/

//CRF encoding
/*
var testCRF = ffmpeg(firstFile)
    .addOptions('-crf 18')
    .on('error', function (err) {
        console.log('An error occurred: ' + err.message);
    })
    .on('end', function () {
        console.log('Processing finished !');
    })
    .saveToFile(outPath);
*/

//Calculating PSNR
var fs = require('fs');
var stream  = fs.createWriteStream('../resource/psnr.log');
var testPSNR = ffmpeg(firstFile)
    .addOptions('-crf 18')
    .outputOption('-psnr')
    .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('progress', function(progress) {
        console.log(JSON.stringify(progress));
    })
    .on('data', function (data) {
        var frame = new Buffer(data).toString('base64');
        console.log(frame);
    })
    .on('error', function (err) {
        console.log('An error occurred: ' + err.message);
    })
    .on('end', function (err,stdout, stderr) {
        console.log('Processing finished !');
       // var regex = /LPSNR=Y:([0-9\.]+) U:([0-9\.]+) V:([0-9\.]+) \*:([0-9\.]+)/
        //var psnr = stdout.match(regex);
        console.log('This transcode scored a PSNR of: ');
        console.log(JSON.stringify(stdout, null, " "));

    })
    .saveToFile(outPath, function(stdout, stderr) {
        console.log('file has been converted succesfully');

    });


/*
var ffstream = testPSNR.pipe();
ffstream.on('data', function(chunk) {
    console.log('ffmpeg just wrote ' + chunk.length + ' bytes');
});*/
/*
var psnr=ffmpeg(firstFile)

    .addOption('-psnr')
    .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('end', function(err, stdout, stderr) {
        console.log(stdout);
        console.log('Processing finished.');

    })
    .on('error', function(err) {
        console.log('An error occurred: ' + err.message);
    })
    .saveToFile(firstFile, function(stdout, stderr) {
        console.log('file has been converted succesfully');
        console.log(JSON.stringify(stdout));
    });*/
