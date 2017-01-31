const
    errors = require('feathers-errors'),
    SequelizeService = require('feathers-sequelize').Service,
    config = require('config.js'),
    {locator} = require('locator.js'),
    {applyOwnerId} = require('hooks/common.js'),
    {addURL} = require('hooks/playlist/playlist.js'),
    {isUUID} = require('validator');

class PlaylistService extends SequelizeService {

  constructor () {
    const Models = locator.get('Models');

    super({
      Model: Models.Playlist
    });
    this.Models = Models;

    // Hooks
    // -----
    this.before = {
      create: [applyOwnerId]
    };

    this.after = {
      get: [addURL],
      create: [addURL],
      update: [addURL]
    };
  }

  _transformBeforeSave (data) {

    delete data.url;

    data.slug = data.slug || data.id;
    data.playlistItems = data.playlistItems || [];

    return data;
  }

  get (id /*, params={} */) {
    const {MediaRef} = this.Models;

    return this.Model.findOne({
      where: isUUID(id) ? {id} : {slug:id},
      include: {
        model: MediaRef,
        through: 'playlistItems'
      }
    }).then(playlist => {
      return playlist
    }).catch(e => {
      return new errors.GeneralError(e);
    });
  }

  find (params={}) {
    const {MediaRef} = this.Models;

    params.sequelize = {
      include: {
        model: MediaRef,
        through: 'playlistItems'
      }
    };

    return super.find(params);
  }

  create (data) {
    data = this._transformBeforeSave(data);

    const {User} = this.Models;
    return User.findById(data.ownerId)
      .then(user => {
        data.ownerName = user.name || '';
        return this.Model.create(data)
          .then(pl => {
            return pl.setMediaRefs(data.playlistItems)
              .then(() => {
                return user.addPlaylists([pl.id])
                  .then(() => {
                    return pl;
                  });
              });
            });
      })
      .catch(e => {
        throw new errors.GeneralError(e);
      });

  }

  update (id, data, params={}) {

    if (!id) {
      throw new errors.NotAcceptable(`Try using POST instead of PUT.`);
    }

    return this.Model.findOne({
      where: {
        $or: [
          {id: id},
          {slug: id}
        ]
      }
    }).then(pl => {

      if (pl === null) {
        throw new errors.NotFound(`Could not find a playlist by "${id}"`)
      }

      if (!pl.ownerId || pl.ownerId !== params.userId) {
        throw new errors.Forbidden();
      }

      data = this._transformBeforeSave(data);

      return pl.addMediaRefs(data.playlistItems)
        .then(() => {
          return this.Model.update(data, {
            where: {
              id: id
            }
          })
            .then(() => {
              return this.get(id, params);
            });
        });

    }).catch(e => {
      throw new errors.GeneralError(e);
    });

  }

}

PlaylistService.prototype.remove = undefined;
PlaylistService.prototype.patch = undefined;

module.exports = PlaylistService;
