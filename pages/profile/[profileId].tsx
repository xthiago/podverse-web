import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import OmniAural from 'omniaural'
import type { MediaRef, Playlist, Podcast, User } from 'podverse-shared'
import { useEffect, useRef, useState } from 'react'
import { ClipListItem, ColumnsWrapper, List, PageHeader, PageScrollableContent, Pagination,
  PlaylistListItem,
  PodcastListItem, ProfilePageHeader, scrollToTopOfPageScrollableContent } from '~/components'
import { Page } from '~/lib/utility/page'
import { PV } from '~/resources'
import { getServerSideAuthenticatedUserInfo } from '~/services/auth'
import { getServerSideUserQueueItems } from '~/services/userQueueItem'
import { getPublicUser, updateLoggedInUser } from '~/services/user'
import { getPodcastsByQuery } from '~/services/podcast'
import { isNotClipsSortOption, isNotPodcastsSubscribedSortOption } from '~/resources/Filters'
import { getUserMediaRefs } from '~/services/mediaRef'
import { getUserPlaylists } from '~/services/playlist'

interface ServerProps extends Page {
  serverFilterType: string
  serverFilterPage: number
  serverFilterSort: string
  serverUser: User
  serverUserListData: (Podcast | MediaRef | Playlist)[]
  serverUserListDataCount: number
}

const keyPrefix = 'pages_profile'

export default function Profile({ serverFilterType, serverFilterPage, serverFilterSort,
  serverUser, serverUserListData, serverUserListDataCount }: ServerProps) {
  const { t } = useTranslation()

  const [filterType, setFilterType] = useState<string>(serverFilterType)
  const [filterSort, setFilterSort] = useState<string>(serverFilterSort)
  const [filterPage, setFilterPage] = useState<number>(serverFilterPage)

  const [user, setUser] = useState<User>(serverUser)
  const [listData, setListData] = useState<(Podcast | MediaRef | Playlist)[]>(serverUserListData)
  const [listDataCount, setListDataCount] = useState<number>(serverUserListDataCount)
  
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editingUserName, setEditingUserName] = useState<string>(serverUser.name)
  const [editingUserIsPublic, setEditingUserIsPublic] = useState<boolean>(serverUser.isPublic)
  
  const initialRender = useRef(true)
  const pageTitle = user.name || t('Anonymous')
  const pageSubTitle = 
    filterType === PV.Filters.type._clips
      ? t('Clips')
      : filterType === PV.Filters.type._podcasts
        ? t('Podcasts')
        : t('Playlists')
  const pageCount = Math.ceil(listDataCount / PV.Config.QUERY_RESULTS_LIMIT_DEFAULT)

  /* useEffects */

  useEffect(() => {
    (async () => {
      if (initialRender.current) {
        initialRender.current = false;
      } else {
        OmniAural.pageIsLoadingShow()
        if (filterType === PV.Filters.type._podcasts) {
          const { data } = await clientQueryUserPodcasts()
          const [newUserPodcasts, newUserPodcastsCount] = data
          setListData(newUserPodcasts)
          setListDataCount(newUserPodcastsCount)
        } else if (filterType === PV.Filters.type._clips) {
          const [newListData, newListDataCount] = await clientQueryUserClips()
          setListData(newListData)
          setListDataCount(newListDataCount)
        } else {
          const [newListData, newListDataCount] = await clientQueryUserPlaylists()
          setListData(newListData)
          setListDataCount(newListDataCount)
        }
        scrollToTopOfPageScrollableContent()
        OmniAural.pageIsLoadingHide()
      }
    })()
  }, [filterType, filterSort, filterPage])

  /* Client-Side Queries */

  const clientQueryUserPodcasts = async () => {
    const subscribedPodcastIds = user?.subscribedPodcastIds || []
    if (subscribedPodcastIds.length === 0) {
      return null
    } else {
      const finalQuery = {
        podcastIds: subscribedPodcastIds,
        ...(filterPage ? { page: filterPage } : {}),
        ...(filterSort ? { sort: filterSort } : {})
      }
      return getPodcastsByQuery(finalQuery)
    }
  }

  const clientQueryUserClips = async () => {
    const finalQuery = {
      ...(filterPage ? { page: filterPage } : {}),
      ...(filterSort ? { sort: filterSort } : {})
    }
    return getUserMediaRefs(user.id, finalQuery)
  }

  const clientQueryUserPlaylists = async () => {
    return getUserPlaylists(user.id, filterPage)
  }

  /* Function Helpers */

  const _handleEditCancel = () => {
    setIsEditing(false)
    setEditingUserName(user.name)
  }

  const _handleEditSave = async () => {
    const userData = {
      id: user.id,
      name: editingUserName || '',
      isPublic: editingUserIsPublic
    }
    OmniAural.pageIsLoadingShow()
    const newUser = await updateLoggedInUser(userData)
    setUser(newUser)
    OmniAural.pageIsLoadingHide()
    setIsEditing(false)
  }

  const _handleEditStart = () => {
    setIsEditing(true)
  }

  const _handleChangeIsPublic = async (selectedItems: any[]) => {
    const selectedItem = selectedItems[0]
    const isPublic = selectedItem.key === PV.Users.privacyKeys.public
    const userData = {
      id: user.id,
      name: editingUserName || '',
      isPublic
    }
    OmniAural.pageIsLoadingShow()
    const newUser = await updateLoggedInUser(userData)
    setUser(newUser)
    OmniAural.pageIsLoadingHide()
  }

  const _handlePrimaryOnChange = (selectedItems: any[]) => {
    const selectedItem = selectedItems[0]
    if (selectedItem.key !== filterType) setFilterPage(1)

    if (
      selectedItem.key === PV.Filters.type._clips
      && isNotClipsSortOption(filterSort)
    ) {
      setFilterSort(PV.Filters.sort._mostRecent)
    } else if (
      selectedItem.key === PV.Filters.type._podcasts
      && isNotPodcastsSubscribedSortOption(filterSort)
    ) {
      setFilterSort(PV.Filters.sort._alphabetical)
    }

    setFilterType(selectedItem.key)
  }

  const _handleSortOnChange = (selectedItems: any[]) => {
    const selectedItem = selectedItems[0]
    if (selectedItem.key !== filterSort) setFilterPage(1)
    setFilterSort(selectedItem.key)
  }

  /* Render Helpers */

  const generateListElements = () => {
    return listData.map((listItem: Podcast | MediaRef | Playlist, index: number) => {
      if (listItem.podcastIndexId) {
        return (
          <PodcastListItem
            key={`${keyPrefix}-${index}`}
            podcast={listItem} />
        )
      } else if (listItem.startTime) {
        return (
          <ClipListItem
            episode={listItem.episode}
            key={`${keyPrefix}-${index}`}
            mediaRef={listItem}
            podcast={listItem.episode.podcast}
            showImage />
        )
      } else {
        return (
          <PlaylistListItem
            key={`${keyPrefix}-${index}`}
            playlist={listItem} />
        )
      }
    })
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ProfilePageHeader
        handleChangeIsPublic={_handleChangeIsPublic}
        handleEditCancel={_handleEditCancel}
        handleEditSave={_handleEditSave}
        handleEditStart={_handleEditStart}
        handleUserNameOnChange={setEditingUserName}
        isEditing={isEditing}
        user={user} />
      <PageScrollableContent>
        <ColumnsWrapper
          mainColumnChildren={
            <>
              <PageHeader
                isSubHeader
                primaryOnChange={_handlePrimaryOnChange}
                primaryOptions={PV.Filters.dropdownOptions.profile.types}
                primarySelected={filterType}
                sortOnChange={_handleSortOnChange}
                sortOptions={
                  filterType === PV.Filters.type._clips
                    ? PV.Filters.dropdownOptions.clips.sort.subscribed
                    : filterType === PV.Filters.type._podcasts
                      ? PV.Filters.dropdownOptions.podcasts.sort.subscribed
                      : null
                }
                sortSelected={filterSort}
                text={pageSubTitle} />
              <List>{generateListElements()}</List>
              <Pagination
                currentPageIndex={filterPage}
                handlePageNavigate={(newPage) => setFilterPage(newPage)}
                handlePageNext={() => { if (filterPage + 1 <= pageCount) setFilterPage(filterPage + 1) }}
                handlePagePrevious={() => { if (filterPage - 1 > 0) setFilterPage(filterPage - 1) }}
                pageCount={pageCount} />
            </>
          }
        />
      </PageScrollableContent>
    </>
  )
}

/* Server-Side Logic */

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { locale, params, req } = ctx
  const { cookies } = req
  const { profileId } = params

  const userInfo = await getServerSideAuthenticatedUserInfo(cookies)
  const userQueueItems = await getServerSideUserQueueItems(cookies)

  const serverFilterType = PV.Filters.type._podcasts
  const serverFilterSort = PV.Filters.sort._alphabetical
  const serverFilterPage = 1

  let serverUser = userInfo
  let serverUserListData = []
  let serverUserListDataCount = 0
  if (!userInfo || userInfo.id !== profileId) {
    serverUser = await getPublicUser(profileId as string)
  }

  const subscribedPodcastIds = serverUser?.subscribedPodcastIds || []

  if (subscribedPodcastIds.length > 0) {
    const response = await getPodcastsByQuery({
      podcastIds: subscribedPodcastIds,
      sort: serverFilterSort
    })
    const [podcasts, podcastsCount] = response.data
    serverUserListData = podcasts
    serverUserListDataCount = podcastsCount
  }

  const serverProps: ServerProps = {
    serverUserInfo: userInfo,
    serverUserQueueItems: userQueueItems,
    ...(await serverSideTranslations(locale, PV.i18n.fileNames.all)),
    serverCookies: cookies,
    serverFilterType,
    serverFilterPage,
    serverFilterSort,
    serverUser,
    serverUserListData,
    serverUserListDataCount
  }

  return {
    props: serverProps
  }
}
