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

/*
api = Tumblr.Api.create({api_key:'3Uj5hvL773MVNlhFJC5gyVftNh4Qxci3hqoPkU3nAzp9bFJ8UB',base_hostname:'w0w13z0w13.tumblr.com'})
api.GetBlogInfo(function(data){ console.log('blog', data) })
api.GetPosts({}, function(data){ console.log('posts', data.posts) })
api.GetPosts({id:31713357832}, function(data){ console.log('post by id', data.posts) })
*/

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
            connectOutlets:function(router) {
                router.api.GetBlogInfo(function(data){
                    router.get('tumbleLogController').set('content', data.blog)
                })
                router.get('applicationController').connectOutlet('tumbleLog')
            },
            index: Em.Route.extend({
                route: '/',
                connectOutlets:function(router) {
                    router.api.GetPosts({}, function(data){
                        router.get('postsController').set('content', data.posts)        
                    })
                    router.get('tumbleLogController').connectOutlet('posts')
                }
            }),
            page: Em.Route.extend({
                route:'/page/:page',
                connectOutlets:function(router,params) {
                    var page = parseInt(params.page),
                        offset = page-1>-1 ? (page-1)*20 : 0
                    router.api.GetPosts({offset:offset}, function(data){
                        router.get('postsController').set('content', data.posts)
                        router.set('onPage', page) 
                    })
                    router.get('tumbleLogController').connectOutlet('posts')
                }
            }),
            postDetail:Em.Route.extend({
                route:'/post/:id',
                connectOutlets:function(router,params) {
                    router.get('applicationController').connectOutlet('tumbleLog')
                    return router.api.GetPosts({id:params.id},function(data){                        
                        router.get('tumbleLogController').set('content', data.blog)
                        router.get('tumbleLogController').connectOutlet('postDetail', data.posts[0])
                    }) 
                }
            })  
        })
    })
})

Tumblr.ApplicationView = Em.View.extend({
    template: Em.Handlebars.compile('{{outlet}}')
})
Tumblr.ApplicationController = Em.Controller.extend()

Tumblr.TumbleLogView = Em.View.extend({
    templateName:'tumblr-app-tmpl'
})
Tumblr.TumbleLogController = Em.Controller.extend({
    page:1
})
Tumblr.NavigationView = Em.View.extend({   
    template:Em.Handlebars.compile('<a {{action showPreviousPage}}>Previous</a> | <a {{action showNextPage}}>Next</a>')
})

/* Core Views and Controllers */
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
    contentBinding:'controller.content',
    classNames:['detail'],
    is_detail:true
})
Tumblr.PostDetailController = Em.Controller.extend()

Tumblr.PostsView = Em.CollectionView.extend({
    tagName:'ul',
    classNames:['thumbnails', 'row'],
    contentBinding:'controller.content',
    itemViewClass: Tumblr.PostView.extend({
        tagName:'li',
        classNames:['preview', 'span2']
    })
})
Tumblr.PostsController = Em.ArrayController.extend()

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

Tumblr.Application = Em.Application.extend({
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

