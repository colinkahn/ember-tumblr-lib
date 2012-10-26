// http://www.tumblr.com/docs/en/api/v2#auth   
Tumblr = Em.Application.create({
    autoinit: false,
    initialize:function(router) {
        this._super(router)
        this.registerHandlebarsHelpers()
    },
    post_types:['photo', 'video', 'text', 'quote', 'link', 'chat', 'audio', 'answer'],
    registerHandlebarsHelpers:function() {
    
        /* Render block if the view does not have is_detail set to 'true' */
        Em.Handlebars.registerHelper('preview', function(options) {
            var is_detail = !Ember.Handlebars.getPath(this, 'view.is_detail', options)
            return !is_detail ? options.inverse(this) : options.fn(this);
        });
        
        /* Render block if the view has is_detail set to 'true' */
        Em.Handlebars.registerHelper('detail', function(options) {
            var is_detail = Ember.Handlebars.getPath(this, 'view.is_detail', options)
            return !is_detail ? options.inverse(this) : options.fn(this);
        });
        
        /* Render each block if the type of the content matches the type of the tag */
        jQuery.each(this.post_types, function(i,type) {
            Em.Handlebars.registerHelper(type, function(options) {
                var is_type = Ember.Handlebars.getPath(this, 'view.content.type', options) == type
                return !is_type ? options.inverse(this) : options.fn(this);
            });
        });
    }
})

Tumblr.Router = Ember.Router.extend({
    root: Ember.Route.extend({
        showHome:Ember.Route.transitionTo('index'),
        showPost:Ember.Route.transitionTo('postDetail'),
        loading: Em.Route.extend({
            connectOutlets: function(router, context){
                router.get('applicationController').connectOutlet('loading', context)                
            }
        }),
        index: Em.Route.extend({
            route: '/',
            deserialize:function(router, params) {
                var deferred = jQuery.Deferred(),
                    resolve = function(json) {
                        router.get('tumbleLogController').set('content', json.response.blog)
                        router.get('postsController').set('content', jQuery.map(json.response.posts, function(obj){
                            return Tumblr.Post.create(obj)
                        }))
                        deferred.resolve() 
                    }
                tumblrJSON(resolve)                
                return deferred.promise()
            },
            connectOutlets:function(router) {
                router.get('applicationController').connectOutlet('tumbleLog')
                router.get('tumbleLogController').connectOutlet('posts')
            }
        }),
        postDetail:Em.Route.extend({
            route:'/post/:id',
            connectOutlets:function(router,post) {
                router.get('tumbleLogController').connectOutlet('postDetail', post)
            }
        })
    })
})

Tumblr.ApplicationController = Em.Controller.extend({})
Tumblr.ApplicationView = Em.View.extend({
    template: Em.Handlebars.compile('{{outlet}}')
})

Tumblr.TumbleLogController = Em.Controller.extend({})
Tumblr.TumbleLogView = Em.View.extend({
    contentBinding:'controller.content',
    templateName:'tumblr-app-tmpl'
})

/* Core Views and Controllers */



Tumblr.Post = Em.Object.extend({
    reblogUrl:function() {
        var id = this.get('id'),
            reblog_key = this.get('reblog_key')
        return "http://www.tumblr.com/reblog/%@/%@".fmt(id, reblog_key)
    }.property()        
})

Tumblr.PostsController = Em.ArrayController.extend({})
Tumblr.PostDetailController = Em.Controller.extend({})

Tumblr.PostView = Em.View.extend({
    classNames:['post'],
    templateName:'tumblr-post-tmpl',
    postBinding:'content'
})
Tumblr.PostDetailView = Tumblr.PostView.extend({
    contentBinding:'controller.content',
    classNames:['detail'],
    is_detail:true
})
Tumblr.PostsView = Em.CollectionView.extend({
    tagName:'ul',
    classNames:['thumbnails', 'row'],
    contentBinding:'controller.content',
    itemViewClass: Tumblr.PostView.extend({
        tagName:'li',
        classNames:['preview', 'span2']
    })
})

/* Helper Views */
Tumblr.PhotoView = Em.View.extend({
    classNames:['photo'],
    init:function() {
        this._super()
        /* Convert our sizes into easily accessible properties */
        this.get('content.alt_sizes').forEach(function(size) {
            this.set('photo-url-'+size.width, Em.Object.create(size))
        }, this)
    }
})   

Tumblr.PhotoSetView = Em.CollectionView.extend({
    tagName:'div',
    classNames:['photoset'],
    itemViewClass:Tumblr.PhotoView
})

Tumblr.VideoView = Em.View.extend({
    classNames:['video'],
    init:function() {
        this._super()
        /* Convert our sizes into easily accessible properties */
        this.get('content').forEach(function(size) {
            this.set('video-embed-'+size.width, Em.Object.create(size))
        }, this)
    }
})

/* Bootstrap */
Tumblr.LoadingController = Em.Controller.extend({
    percent:0
})

Tumblr.LoadingView = Em.View.extend({
    classNames:['progress', 'progress-striped', 'active'],
    template:Em.Handlebars.compile('{{view view.bar}}'),
    bar:Em.View.extend({
        classNames:['bar'],
        percentBinding:'parentView.controller.percent',
        _percent_observer:function(){
            this.$().css('width', this.get('percent')+'%')
        }.observes('percent'),
        didInsertElement:function() {
            var view = this
            this.$().bind("ajaxProgress", function(jqEvent, progressEvent, jqXHR) {
                if (progressEvent.lengthComputable) {
                    view.set('percent', Math.round(progressEvent.loaded / progressEvent.total * 100))
                }
            })   
        }
    })
})