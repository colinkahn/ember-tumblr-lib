// http://stackoverflow.com/questions/1568210/integrating-tumblr-blog-with-website/3393151#3393151

Tumblr = Em.Object.create({
    api_key:'3Uj5hvL773MVNlhFJC5gyVftNh4Qxci3hqoPkU3nAzp9bFJ8UB',
    base_hostname:'w0w13z0w13.tumblr.com'
})

Ember.ResourceAdapter.reopen({
    _prepareResourceRequest: function(params){
        params.dataType = 'JSONP'
    }
})

Tumblr.Blog = Ember.Resource.extend({
    resourceUrl: 'http://api.tumblr.com/v2/blog/%@/info?api_key=%@'.fmt(Tumblr.get('base_hostname'), Tumblr.get('api_key')),
    resourceName: 'blog',
    deserialize: function(json) {
        try {
            return this._super(json.response.blog)
        } finally {
            return this
        }
    }
})

Tumblr.blogController = Ember.ResourceController.create({
  resourceType: Tumblr.Blog
});

Tumblr.Post = Ember.Resource.extend({
    resourceUrl: 'http://api.tumblr.com/v2/blog/%@/posts?api_key=%@'.fmt(Tumblr.get('base_hostname'), Tumblr.get('api_key')),
    resourceName: 'post',
    deserialize: function(json) {
        try {
            return this._super(json.response.posts[0])
        } finally {
            return this
        }
    }
});

Tumblr.postController = Ember.ResourceController.create({
    resourceType: Tumblr.Post,
    loadAll: function(json) {
        this._super(json.response.posts)
    }
});

// https://github.com/emberjs/ember.js/issues/1378

Tumblr.Router = Ember.Router.extend({
    enableLogging:true,
    root: Ember.Route.extend({
        showHome:Ember.Route.transitionTo('index'),
        index: Em.Route.extend({
            route:'/',
            redirectsTo:'blog.index'
        }),
        blog: Em.Route.extend({
            route:'/blog',
            index: Em.Route.extend({
                route: '/',
                redirectsTo: 'blog.posts'
            }),
            posts: Em.Route.extend({
                route:'/page/:page',
                connectOutlets:function(router,params) {
                    var page = parseInt(params.page),
                        offset = (page-1)*20
                    router.api.GetPosts({offset:offset}, function(data){
                        router.get('tumblrPostsController').set('content', data.posts)
                        router.get('tumblrPostsController').set('is_loading', false)
                        router.set('onPage', page)
                    })
                    router.get('tumblrBlogController').connectOutlet('tumblrPosts')
                    router.get('tumblrPostsController').set('is_loading', true)
                }
            }),
            postDetail:Em.Route.extend({
                route:'/post/:id',
                connectOutlets:function(router,params) {
                    router.get('applicationController').connectOutlet('tumblrBlog')
                    return router.api.GetPosts({id:params.id},function(data){
                        router.get('tumblrBlogController').set('content', data.blog)
                        router.get('tumblrBlogController').connectOutlet('tumblrPostDetail', data.posts[0])
                    })
                }
            })
        })
    })
})

/* Outlet Views */
Tumblr.ApplicationView = Em.View.extend({
    template: Em.Handlebars.compile('<div class="row">{{outlet}}</div>')
})
Tumblr.ApplicationController = Em.Controller.extend()

Tumblr.TumblrBlogView = Em.View.extend({
    templateName:'tumblr-blog-tmpl'
})
Tumblr.TumblrBlogController = Em.Controller.extend({
    page:1
})
Tumblr.TumblrPostsView = Em.View.extend({
    templateName:'tumblr-posts-tmpl'
})
Tumblr.TumblrPostsController = Em.Controller.extend()
Tumblr.TumblrPostDetailView = Em.View.extend({
    templateName: 'tumblr-postdetail-tmpl'
})
Tumblr.TumblrPostDetailController = Em.Controller.extend()

Tumblr.NavigationView = Em.View.extend({
    template:Em.Handlebars.compile('<a {{action showPreviousPage}} href="#">Previous</a> | <a {{action showNextPage}} href="#">Next</a>')
})

/* Core Object Views */

Tumblr.PostView = Em.View.extend({
    classNames:['post'],
    templateName:'tumblr-post-tmpl',
    postBinding:'content'
})

Tumblr.PostDetailView = Tumblr.PostView.extend({
    classNames:['detail'],
    is_detail:true
})

Tumblr.PostsView = Em.CollectionView.extend({
    tagName:'div',
    classNames:['span7', 'offset5'],
    itemViewClass: Tumblr.PostView.extend({
        tagName:'div',
        classNames:[]
    })
})

/* Helper Views */
Tumblr.PhotoView = Em.View.extend({
    classNames:['photo'],
    init:function() {
        this._super()
        var sizes = Em.ArrayController.create({
            content:this.get('content.alt_sizes'),
            sortProperties: ['width']
        })
        this.set('sizes',sizes)
    },
    unknownProperty: function(keyName) {
        if (keyName.indexOf('photo-url-') != -1) {
            var sizes = this.get('sizes'),
                width = parseInt(keyName.replace('photo-url-','')),
                size = sizes.findProperty('width', width)
            if (!size) {
                size = sizes.get('lastObject')
            }
            return size
        }
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

/* Application */
Tumblr.Application = Em.Application.extend({
    autoinit: false,
    init:function() {
        this._super()
        this.ApplicationView = Tumblr.ApplicationView
        this.ApplicationController = Tumblr.ApplicationController
        this.TumblrBlogView = Tumblr.TumblrBlogView
        this.TumblrBlogController = Tumblr.TumblrBlogController
        this.TumblrPostDetailView = Tumblr.TumblrPostDetailView
        this.TumblrPostDetailController = Tumblr.TumblrPostDetailController
        this.TumblrPostsView = Tumblr.TumblrPostsView
        this.TumblrPostsController = Tumblr.TumblrPostsController
    },
    initialize:function(router) {
        if (!router) {
            router = Tumblr.Router.create({
                api: Tumblr.Api.create(this.getWithDefault('apiParams',{}))
            })
        }
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

