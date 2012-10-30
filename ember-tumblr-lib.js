// http://stackoverflow.com/questions/1568210/integrating-tumblr-blog-with-website/3393151#3393151

Tumblr = {}

Tumblr.Api = Em.Object.extend({
    api_key:null,
    base_hostname:null,
    blogClass:Em.Object,
    postClass:Em.Object,
    _WrapCallback:function(callback, deferred) {
        var api = this,
            wrapped = function(json) {
                var data = api._MakeEmberObjects(json),
                    toConnectOutlets = callback(data)
                deferred.resolve(toConnectOutlets)
            }
        return wrapped
    },
    _MakeEmberObjects:function(json) {
        var blog = json.response.blog,
            posts = json.response.posts,
            blogClass = this.get('blogClass'),
            postClass = this.get('postClass'),
            data = {}
        data.blog = blog && blogClass.create(blog)
        data.posts = posts && jQuery.map(posts, function(post){
                                    return postClass.create(post)
                                })
        return data
    },
    _FetchUrl:function(url, callback, params) {
        var ajaxParams = {
            dataType:'jsonp',
            url:url,
            data:params,
            success:callback
        }
        jQuery.ajax(ajaxParams)
    },
    _NewDeferred:function() {
        return jQuery.Deferred()
    },
    _BuildURL:function(at) {
        var base_hostname = this.get('base_hostname'),
            api_key = this.get('api_key'),
            url = "http://api.tumblr.com/v2/blog/%@/%@?api_key=%@".fmt(base_hostname, at, api_key)
        return url
    },
    GetBlogInfo:function(callback) {
        var url = this._BuildURL('info')
            deferred = this._NewDeferred(),
            wrapped = this._WrapCallback(callback,deferred)
        this._FetchUrl(url,wrapped,{})
        return deferred.promise()
    },
    GetPosts:function(params, callback) {
        var url = this._BuildURL('posts')
            deferred = this._NewDeferred(),
            wrapped = this._WrapCallback(callback,deferred)
        this._FetchUrl(url,wrapped,params)
        return deferred.promise()
    }
})

// https://github.com/emberjs/ember.js/issues/1378

Tumblr.Router = Ember.Router.extend({
    enableLogging:true,
    root: Ember.Route.extend({
        index: Em.Route.extend({
            route:'/',
            redirectsTo:'blog.index'
        }),
        blog: Em.Route.extend({
            route:'/blog',

            /* Actions */
            showHome:Ember.Route.transitionTo('index'),
            showPost:Ember.Route.transitionTo('postDetail'),
            showNextPage:function(router) {
                var page = router.getWithDefault('onPage', 1)
                router.transitionTo('page',{page:isNaN(page) && 1 || page+1})
            },
            showPreviousPage:function(router) {
                var page = router.getWithDefault('onPage', 1)
                router.transitionTo('page',{page:isNaN(page) && 1 || page-1})
            },
            showCurrentPage:function(router) {
                var page = router.getWithDefault('onPage', 1)
                router.transitionTo('page',{page:isNaN(page) && 1 || page})
            },
            connectOutlets:function(router) {
                router.api.GetBlogInfo(function(data){
                    router.get('tumblrBlogController').set('content', data.blog)
                })
                router.get('applicationController').connectOutlet('tumblrBlog')
            },
            index: Em.Route.extend({
                route: '/',
                connectOutlets:function(router) {
                    router.api.GetPosts({}, function(data){
                        router.get('tumblrPostsController').set('content', data.posts)
                        router.get('tumblrPostsController').set('is_loading', false)
                        router.set('onPage', 1)
                    })
                    router.get('tumblrBlogController').connectOutlet('tumblrPosts')
                    router.get('tumblrPostsController').set('is_loading', true)
                }
            }),
            page: Em.Route.extend({
                route:'/page/:page',
                connectOutlets:function(router,params) {
                    var page = parseInt(params.page),
                        offset = page-1>-1 ? (page-1)*20 : 0
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
    template: Em.Handlebars.compile('{{outlet}}')
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
Tumblr.Post = Em.Object.extend({
    reblogUrl:function() {
        var id = this.get('id'),
            reblog_key = this.get('reblog_key')
        return "http://www.tumblr.com/reblog/%@/%@".fmt(id, reblog_key)
    }.property()
})

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
    tagName:'ul',
    classNames:['thumbnails', 'row'],
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

