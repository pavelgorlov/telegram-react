/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import * as ReactDOM from 'react-dom';
import classNames from 'classnames';
import { getMedia, openMedia } from '../../Utils/Message';
import { borderStyle } from '../Theme';
import { withStyles } from '@material-ui/core';
import PlayerStore from '../../Stores/PlayerStore';
import TdLibController from '../../Controllers/TdLibController';
import './Playlist.css';

const styles = theme => ({
    root: {
        background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF'
    },
    ...borderStyle(theme)
});

class Playlist extends React.Component {
    constructor(props) {
        super(props);

        this.listRef = React.createRef();
        this.itemRefMap = new Map();

        const { message, playlist } = PlayerStore;

        this.chatId = message ? message.chat_id : 0;
        this.messageId = message ? message.id : 0;

        this.state = {
            open: false,
            titleMouseOver: false,
            playlistMouseOver: false,
            playlist: playlist
        };
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const { open } = this.state;

        if (!prevState.open && open) {
            this.scrollToActive();
        }
    }

    scrollToActive = () => {
        const list = this.listRef.current;
        if (!list) return;

        const { messageId } = this;
        if (!messageId) return;

        const item = this.itemRefMap.get(messageId);
        if (!item) return;

        const node = ReactDOM.findDOMNode(item);
        if (!node) return;

        list.scrollTop = node.offsetTop - 15;
    };

    componentDidMount() {
        PlayerStore.on('clientUpdateMediaActive', this.onClientUpdateMediaActive);
        PlayerStore.on('clientUpdateMediaPlaylist', this.onClientUpdateMediaPlaylist);
        PlayerStore.on('clientUpdateMediaPlaylistLoading', this.onClientUpdateMediaPlaylistLoading);
        PlayerStore.on('clientUpdateMediaTitleMouseOver', this.onClientUpdateMediaTitleMouseOver);
    }

    componentWillUnmount() {
        PlayerStore.removeListener('clientUpdateMediaActive', this.onClientUpdateMediaActive);
        PlayerStore.removeListener('clientUpdateMediaPlaylist', this.onClientUpdateMediaPlaylist);
        PlayerStore.removeListener('clientUpdateMediaPlaylistLoading', this.onClientUpdateMediaPlaylistLoading);
        PlayerStore.removeListener('clientUpdateMediaTitleMouseOver', this.onClientUpdateMediaTitleMouseOver);
    }

    onClientUpdateMediaTitleMouseOver = update => {
        const { over } = update;

        if (over) {
            this.setState(
                {
                    playlistMouseOver: over
                },
                () => {
                    this.tryOpen();
                }
            );
        } else {
            this.setState(
                {
                    playlistMouseOver: over
                },
                () => {
                    this.tryClose();
                }
            );
        }
    };

    onClientUpdateMediaActive = update => {
        const { chatId, messageId } = update;

        this.chatId = chatId;
        this.messageId = messageId;
    };

    onClientUpdateMediaPlaylistLoading = update => {
        const { chatId, messageId } = this;

        if (update.chatId === chatId && update.messageId === messageId) {
            this.setState({
                playlist: null
            });
        }
    };

    onClientUpdateMediaPlaylist = update => {
        const { chatId, messageId } = this;
        const { playlist } = update;

        if (chatId === playlist.chatId && messageId === playlist.messageId) {
            this.setState({
                playlist: playlist
            });
        }
    };

    tryOpen = () => {
        clearTimeout(this.openTimeout);

        this.openTimeout = setTimeout(() => {
            const { titleMouseOver, playlistMouseOver } = this.state;
            this.setState({
                open: titleMouseOver || playlistMouseOver
            });
        }, 250);
    };

    tryClose = () => {
        clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
            const { titleMouseOver, playlistMouseOver } = this.state;
            this.setState({
                open: titleMouseOver || playlistMouseOver
            });
        }, 250);
    };

    handleMouseEnter = () => {
        this.setState({
            playlistMouseOver: true,
            open: true
        });
    };

    handleMouseLeave = () => {
        this.setState(
            {
                playlistMouseOver: false
            },
            () => {
                this.tryClose();
            }
        );
    };

    handleScroll = () => {
        const list = this.listRef.current;
        if (!list) return;

        if (list.scrollTop === 0) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateMediaPlaylistNext'
            });
        } else if (list.scrollHeight === list.scrollTop + list.offsetHeight) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateMediaPlaylistPrev'
            });
        }
    };

    render() {
        const { classes } = this.props;

        const { open, playlist } = this.state;
        if (!open) return null;
        if (!playlist) return null;

        const { messages } = playlist;
        if (!messages) return null;
        if (messages.length <= 1) return null;

        this.itemRefMap.clear();

        return (
            <div className='playlist'>
                <div className={classNames('playlist-wrapper', classes.root, classes.borderColor)}>
                    <div
                        ref={this.listRef}
                        className='playlist-items'
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                        onScroll={this.handleScroll}>
                        {playlist.messages
                            .slice(0)
                            .reverse()
                            .map(x => (
                                <div key={x.id} ref={el => this.itemRefMap.set(x.id, el)} className='playlist-item'>
                                    {getMedia(x, () => openMedia(x.chat_id, x.id))}
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default withStyles(styles)(Playlist);
