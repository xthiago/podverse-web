const errors = require('feathers-errors');

const PlaylistService = require('services/playlist/PlaylistService.js');
const {configureDatabaseModels, createTestPlaylist, createTestMediaRefs} = require('test/helpers.js');

const {applyOwnerId} = require('hooks/common.js');

const config = require('config');

describe('PlaylistService', function () {

  configureDatabaseModels(function (Models) {
    this.Models = Models;
  });

  beforeEach(function (done) {

    const {Playlist} = this.Models;

    this.playlistSvc = new PlaylistService({Models: this.Models});

    createTestPlaylist(this.Models)
      .then(playlist => {
        this.playlist = playlist;
        done();
      })
      .catch(done);

  });

  it('should go', function () {
    expect(this.playlistSvc).to.be.ok;
  });

  it('should have the expected before-create hooks', function() {
    verifyBeforeCreateHooks(this.playlistSvc, [
      applyOwnerId
    ]);
  });

  it('should have remove disabled', function () {
    expect(this.playlistSvc.remove).to.be.not.ok;
  });

  it('should have patch disabled', function () {
    expect(this.playlistSvc.patch).to.be.not.ok;
  });

  describe('when getting a playlist by id', function() {

    beforeEach(function (done) {
      this.playlistSvc.get(this.playlist.id)
        .then(playlist => {
          this.resultPlaylist = playlist;
          done();
        });
    });

    it('should have the expected title', function () {
      expect(this.resultPlaylist.title).to.equal('Playlist Title');
    });

  });

  describe('when getting a playlist by slug', function () {

    beforeEach(function (done) {
      this.playlistSvc.get(this.playlist.slug)
        .then(playlist => {
          this.resultPlaylist = playlist;
          done();
        });
    });

    it('should have the expected title', function () {
      expect(this.resultPlaylist.title).to.equal('Playlist Title');
    });

  });

  describe('when creating a playlist', function () {

    beforeEach(function (done) {

      createTestMediaRefs(this.Models)
        .then(mediaRefs => {

          this.testData = {
            ownerId: 'kungfury@podverse.fm',
            title: 'Jubjub',
            slug: 'tumtum',
            playlistItems: [mediaRefs[0], mediaRefs[1]]
          };

          this.playlistSvc.create(this.testData)
            .then(playlist => {
              this.resolvedVal = playlist;
              this.playlistId = playlist.id;
              done();
            })
            .catch(done);
          });

    });

    it('should have the expected ownerId', function () {
      expect(this.resolvedVal.ownerId).to.equal('kungfury@podverse.fm');
    });

    // TODO: broken, improperly done test
    it('should have the expected MediaRefs associated with it', function (done) {
      this.resolvedVal.getMediaRefs().then(function (mediaRefs) {
        let mediaRefTitles = mediaRefs.map(mediaRef => mediaRef.title).sort();
        expect(mediaRefTitles[0]).to.equal('TestTitle0');
        expect(mediaRefTitles[1]).to.equal('TestTitle1');
        done();
      });
    });

    xit('should ensure slug has only valid characters');

  });

  describe('when updating a playlist as another user id', function() {

    xit('should throw NotAuthenticated', function (done) {
      this.playlistSvc.update(this.playlistId, {}, {userId: 'hackerman@podverse.tv'})
        .then(done)
        .catch(err => {
          expect(err.name).to.equal('Forbidden');
          done();
        });
    });

  });

  describe('when updating a playlist as the correct user id', function () {

    beforeEach(function(done) {
      createTestMediaRefs(this.Models)
        .then(mediaRef => {
          this.newPlaylist = {
            ownerId: 'kungfury@podverse.fm',
            title: 'Updated Playlist Title',
            slug: 'updated-playlist-slug',
            playlistItems: [mediaRef[2].id, mediaRef[3].id]
          };

          this.playlistSvc.update(this.playlist.id, this.newPlaylist, {userId: 'kungfury@podverse.fm'})
            .then(playlist => {

              this.updatedPlaylist = playlist;
              done();
            });

        });
    });

    it('should have a new title', function () {
      expect(this.updatedPlaylist.title).to.equal('Updated Playlist Title');
    });

    it('should have a new slug', function () {
      expect(this.updatedPlaylist.slug).to.equal('updated-playlist-slug');
    });

    it('should return all the expected playlist items', function () {
      let mediaRefs = this.updatedPlaylist.mediaRefs;
      let mediaRefTitles = mediaRefs.map(mediaRef => mediaRef.title).sort();
      expect(mediaRefTitles[0]).to.equal('TestTitle0');
      expect(mediaRefTitles[1]).to.equal('TestTitle1');
      expect(mediaRefTitles[2]).to.equal('TestTitle2');
      expect(mediaRefTitles[3]).to.equal('TestTitle3');
    });

    xit('should ensure slug has only valid characters');

  });

  describe('when finding all playlists', function () {

    beforeEach(function (done) {
      this.playlistSvc.find()
        .then(playlists => {
          this.foundPlaylists = playlists;
          done();
        });
    });

    it('a playlist should have a mediaRefs property', function () {
      expect(this.foundPlaylists[0].mediaRefs).to.exist;
    });

  });

});
